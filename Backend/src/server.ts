import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config/env';
import apiRoutes from './routes/api.routes';

// Connect to MongoDB Atlas
if (config.mongodbUri) {
  mongoose
    .connect(config.mongodbUri)
    .then(() => {
      console.log(`🌿 Connected to MongoDB Atlas successfully!`);
    })
    .catch((err) => {
      console.error(`⚠️ MongoDB connection warning:`, err.message);
    });
}

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AIIMS Backend API', version: '1.0.0' });
});

// Serve 3D Learner Mascot Image
app.get('/api/mascot', (req, res) => {
  const imagePath = '/Users/nithishkumar07/.gemini/antigravity-ide/brain/15116c1c-6582-4df7-b482-51099d1cf792/aiims_learning_student_1789836271046.jpg';
  res.sendFile(imagePath);
});

// Main API Router
app.use('/api', apiRoutes);

app.listen(config.port, () => {
  console.log(`=================================================`);
  console.log(`🚀 AIIMS Backend API running on port ${config.port}`);
  console.log(`=================================================`);
});
