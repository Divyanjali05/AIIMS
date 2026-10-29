import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config, validateStartupConfig } from './config/env';
import apiRoutes from './routes/api.routes';
import { ToolDiscoveryService } from './services/wallet/toolDiscovery.service';
import { ToolCatalogService } from './services/wallet/toolCatalog.service';
import { logger, requestLogger } from './utils/logger';
import { sentryErrorHandler } from './utils/sentry';
import { syncAllDatabaseIndexes } from './services/databaseIndex.service';
import { csrfMiddleware, getCsrfTokenHandler } from './middleware/csrf.middleware';

export const app = express();

// Trust first proxy hop (e.g. Cloudflare / Nginx / ALB) for accurate IP resolution
app.set('trust proxy', 1);

// 1. Helmet Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Avoid blocking external fonts, assets, and frontend SPA resources
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows /api/mascot and JSON API consumption
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS Configuration with explicit origin allowlist
const allowedOrigins = config.allowedOrigins;

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, mobile apps, Postman, server-to-server) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Client',
    'X-CSRF-Token',
    'CSRF-Token',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After', 'X-CSRF-Token'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Safe CORS error response handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (
    err &&
    err.message &&
    typeof err.message === 'string' &&
    err.message.startsWith('CORS blocked:')
  ) {
    return res.status(403).json({
      error: 'Access denied by CORS policy',
      code: 'CORS_FORBIDDEN',
    });
  }
  next(err);
});

app.use(requestLogger);
app.use(cookieParser(config.jwtSecret));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(csrfMiddleware);

// CSRF Token issuance endpoint
app.get('/api/csrf-token', getCsrfTokenHandler);

// 3. Health & Readiness Endpoints
const handleHealthCheck = (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    service: 'AIIMS Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      connected: isDbConnected,
      mode: isDbConnected ? 'mongodb' : 'fallback',
    },
  });
};

const handleReadinessCheck = (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (isDbConnected) {
    res.status(200).json({
      status: 'ready',
      database: 'connected',
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
    });
  }
};

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);
app.get('/ready', handleReadinessCheck);
app.get('/api/ready', handleReadinessCheck);

// 4. Serve 3D Learner Mascot Image safely
app.get('/api/mascot', (req: Request, res: Response) => {
  const localMascot = path.resolve(__dirname, '../../Frontend/public/robot_mascot.jpg');
  if (fs.existsSync(localMascot)) {
    return res.sendFile(localMascot);
  }
  res.status(404).json({ error: 'Mascot image asset not found' });
});

// 5. Main API Router
app.use('/api', apiRoutes);

// Optional Sentry Error Monitoring Hook
app.use(sentryErrorHandler);

// 6. Database Connection Lifecycle with Bounded Retries & Timeout
export interface DatabaseConnectionStatus {
  connected: boolean;
  mode: 'mongodb' | 'fallback';
  warning?: string;
}

export async function initDatabase(
  maxRetries: number = 2,
  timeoutMs: number = 5000
): Promise<DatabaseConnectionStatus> {
  if (!config.mongodbUri) {
    if (config.nodeEnv === 'production') {
      throw new Error(
        'FATAL: Configuration error for variable MONGODB_URI: variable is missing in production.'
      );
    }
    logger.info(
      '[Database] No MONGODB_URI configured. Running in in-memory development fallback mode.'
    );
    return { connected: false, mode: 'fallback' };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (config.nodeEnv !== 'production') {
        console.log(`📡 [DB] Connecting to MongoDB Atlas (attempt ${attempt}/${maxRetries})...`);
      } else {
        logger.info(`[Database] Connecting to MongoDB (attempt ${attempt}/${maxRetries})...`);
      }

      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
      });

      if (config.nodeEnv !== 'production') {
        console.log('🌿 Connected to MongoDB Atlas successfully!');
      } else {
        logger.info('[Database] Connected to MongoDB successfully.');
      }

      // Synchronize database indexes at deploy/startup before traffic
      try {
        await syncAllDatabaseIndexes();
      } catch (indexErr: any) {
        logger.warn(`[Database] Index synchronization notice: ${indexErr.message}`);
      }

      try {
        await ToolCatalogService.cleanInvalidDiscoveryRecords();
        await ToolCatalogService.syncFromDatabase();
      } catch (syncErr: any) {
        logger.warn(`[Database] Catalog sync notice: ${syncErr.message}`);
      }
      return { connected: true, mode: 'mongodb' };
    } catch (err: any) {
      logger.warn(`[Database] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        if (config.nodeEnv === 'production') {
          throw new Error(`FATAL: Database connection failed in production: ${err.message}`);
        }
        logger.warn('[Database] Falling back to in-memory mode for offline development.');
        return { connected: false, mode: 'fallback', warning: err.message };
      }
    }
  }

  return { connected: false, mode: 'fallback' };
}

// 7. Structured Server Startup Function
export async function startServer() {
  // Validate production configuration before attempting startup
  validateStartupConfig();

  const dbStatus = await initDatabase();

  const server = app.listen(config.port, '0.0.0.0', () => {
    if (config.nodeEnv === 'production') {
      logger.info('AIIMS Backend API running', {
        port: config.port,
        host: '0.0.0.0',
        databaseMode: dbStatus.connected ? 'mongodb' : 'fallback',
        environment: 'production',
        helmet: 'active',
      });
    } else {
      console.log(`=================================================`);
      console.log(`🚀 AIIMS Backend API running on port ${config.port} (0.0.0.0)`);
      console.log(
        `📡 Database Mode: ${dbStatus.connected ? 'MongoDB Atlas (Connected)' : 'In-Memory Development Fallback'}`
      );
      console.log(`🛡️  Security Headers: Helmet active`);
      console.log(`🔒 CORS Origin Policy: ${allowedOrigins.join(', ')}`);
      console.log(`=================================================`);
    }

    // Start daily AI tool discovery worker scheduler
    ToolDiscoveryService.startDiscoveryScheduler();
  });

  return server;
}

// Automatically start when executed directly
if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Server fatal startup failure', err);
    process.exit(1);
  });
}
