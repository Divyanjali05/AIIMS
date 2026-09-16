import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import apiRoutes from './routes/api.routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AIIMS Backend API', version: '1.0.0' });
});

// Main API Router
app.use('/api', apiRoutes);

app.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 AIIMS Backend API running on port ${config.port}`);
  console.log(`=================================================`);
});
