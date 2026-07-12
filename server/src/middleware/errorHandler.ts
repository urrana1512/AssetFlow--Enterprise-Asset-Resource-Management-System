import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[SERVER ERROR]:', error);
  res.status(500).json({
    message: error.message || 'An unexpected server error occurred',
  });
}
