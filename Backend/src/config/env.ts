import dotenv from 'dotenv';
import path from 'path';

// Load .env from Backend directory or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const config = {
  port: process.env.PORT || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'aiims-secret-key-2026',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'mock-claude-key',
  claudeModel: 'claude-3-5-sonnet-20241022',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  mongodbUri: process.env.MONGODB_URI || ''
};

