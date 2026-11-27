import { Router } from 'express';
import mongoose from 'mongoose';
import { connectDatabase } from '../lib/mongo.js';

export const healthRouter = Router();

function safeConnectionError(error: unknown): { name: string; code?: string; message?: string } {
  if (!(error instanceof Error)) return { name: 'UnknownError' };
  const code = (error as Error & { code?: unknown }).code;
  const details: { name: string; code?: string; message?: string } = {
    name: error.name,
    message: error.message.replace(/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi, 'mongodb://[REDACTED]@'),
  };
  if (typeof code === 'string' || typeof code === 'number') details.code = String(code);
  return details;
}

healthRouter.get('/health', async (_request, response) => {
  try {
    await connectDatabase();
    await mongoose.connection.db?.admin().command({ ping: 1 });
    response.setHeader('Cache-Control', 'no-store');
    response.status(200).json({ data: { status: 'ok' } });
  } catch (error: unknown) {
    console.error('Database health check failed.', safeConnectionError(error));
    response.setHeader('Cache-Control', 'no-store');
    response.status(503).json({
      error: {
        code: 'INTERNAL',
        message: 'Service is temporarily unavailable.',
        details: {},
      },
    });
  }
});
