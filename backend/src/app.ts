import express from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { listingsRouter } from './routes/listings.js';
import { requestsRouter } from './routes/requests.js';
import { adminRouter } from './routes/admin.js';
import { ApiError, errorResponse } from './lib/http.js';

export const app = express();
export default app;

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb', strict: true }));
app.use('/api/v1', healthRouter);
app.use('/api/v1', authRouter);
app.use('/api/v1', listingsRouter);
app.use('/api/v1', requestsRouter);
app.use('/api/v1', adminRouter);

app.use((_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found.',
      details: {},
    },
  });
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ApiError) {
    if (error.retryAfterSeconds) response.setHeader('Retry-After', String(error.retryAfterSeconds));
    response.status(error.status).json(errorResponse(error.code, error.message, error.details));
    return;
  }
  if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    response.status(400).json(errorResponse('INVALID_JSON', 'Request body must be valid JSON.', {}));
    return;
  }
  response.status(500).json(errorResponse('INTERNAL_ERROR', 'Unable to complete the request.', {}));
});
