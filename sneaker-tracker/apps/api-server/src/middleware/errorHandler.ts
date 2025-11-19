import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error details
  logger.error({
    statusCode,
    message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // In production, don't send stack traces to the client
  const responseBody = {
    error: {
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(responseBody);
};