import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'aiims-secret-key-2026',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || 'mock-claude-key',
  claudeModel: 'claude-3-5-sonnet-20241022'
};
