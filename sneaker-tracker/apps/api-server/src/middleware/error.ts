import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        details: err.details
      }
    });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      message: 'Internal server error'
    }
  });
};