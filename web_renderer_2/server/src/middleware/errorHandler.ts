import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(`[ERROR] ${err.message}`);
  console.error(err.stack);

  const body: ErrorResponse = {
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  };

  res.status(500).json(body);
}
