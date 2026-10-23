import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from './config/env';
import apiRoutes from './routes/api.routes';
import { ToolDiscoveryService } from './services/wallet/toolDiscovery.service';
import { ToolCatalogService } from './services/wallet/toolCatalog.service';

export const app = express();

// 1. Helmet Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Avoid blocking external fonts, assets, and frontend SPA resources
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows /api/mascot and JSON API consumption
    crossOriginEmbedderPolicy: false
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Safe CORS error response handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err && err.message && typeof err.message === 'string' && err.message.startsWith('CORS blocked:')) {
    return res.status(403).json({
      error: 'Access denied by CORS policy',
      code: 'CORS_FORBIDDEN'
    });
  }
  next(err);
});

app.use(express.json());

// 3. Health Check with Database Status
app.get('/health', (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    service: 'AIIMS Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      connected: isDbConnected,
      mode: isDbConnected ? 'mongodb' : 'fallback'
    }
  });
});

app.get('/api/health', (req: Request, res: Response) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    service: 'AIIMS Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      connected: isDbConnected,
      mode: isDbConnected ? 'mongodb' : 'fallback'
    }
  });
});

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
      throw new Error('FATAL: MONGODB_URI is required in production environment.');
    }
    console.log('ℹ️  [DB] No MONGODB_URI configured. Running in in-memory development fallback mode.');
    return { connected: false, mode: 'fallback' };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 [DB] Connecting to MongoDB Atlas (attempt ${attempt}/${maxRetries})...`);
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs
      });
      console.log('🌿 Connected to MongoDB Atlas successfully!');

      try {
        await ToolCatalogService.cleanInvalidDiscoveryRecords();
        await ToolCatalogService.syncFromDatabase();
      } catch (syncErr: any) {
        console.warn('⚠️  [DB] Catalog sync notice:', syncErr.message);
      }
      return { connected: true, mode: 'mongodb' };
    } catch (err: any) {
      console.warn(`⚠️  [DB] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        if (config.nodeEnv === 'production') {
          throw new Error(`FATAL: Database connection failed in production: ${err.message}`);
        }
        console.warn('⚠️  [DB] Falling back to in-memory mode for offline development.');
        return { connected: false, mode: 'fallback', warning: err.message };
      }
    }
  }

  return { connected: false, mode: 'fallback' };
}

// 7. Structured Server Startup Function
export async function startServer() {
  const dbStatus = await initDatabase();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`🚀 AIIMS Backend API running on port ${config.port} (0.0.0.0)`);
    console.log(`📡 Database Mode: ${dbStatus.connected ? 'MongoDB Atlas (Connected)' : 'In-Memory Development Fallback'}`);
    console.log(`🛡️  Security Headers: Helmet active`);
    console.log(`🔒 CORS Origin Policy: ${allowedOrigins.join(', ')}`);
    console.log(`=================================================`);

    // Start daily AI tool discovery worker scheduler
    ToolDiscoveryService.startDiscoveryScheduler();
  });

  return server;
}

// Automatically start when executed directly
if (require.main === module) {
  startServer().catch((err) => {
    console.error('❌ Server fatal startup failure:', err.message);
    process.exit(1);
  });
}

