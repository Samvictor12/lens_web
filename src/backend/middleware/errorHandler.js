import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

// Custom error class for API errors
export class APIError extends Error {
  constructor(statusCode, message, code, details) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({
          status: 'error',
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'A record with this value already exists.',
          details: error.meta
        });
      
      case 'P2014': // Required relation violation
        return res.status(400).json({
          status: 'error',
          code: 'INVALID_RELATION',
          message: 'Invalid or missing required relation.',
          details: error.meta
        });
      
      case 'P2003': // Foreign key constraint violation
        return res.status(400).json({
          status: 'error',
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Invalid reference to a related record.',
          details: error.meta
        });
      
      case 'P2025': // Record not found
        return res.status(404).json({
          status: 'error',
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found.',
          details: error.meta
        });

      default:
        return res.status(500).json({
          status: 'error',
          code: 'DATABASE_ERROR',
          message: 'An error occurred while accessing the database.',
          details: process.env.NODE_ENV === 'development' ? {
            code: error.code,
            meta: error.meta,
            message: error.message
          } : undefined
        });
    }
  }

  // Handle validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request data.',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
        code: e.code
      }))
    });
  }

  // Handle custom API errors
  if (error instanceof APIError) {
    return res.status(error.statusCode).json({
      status: 'error',
      code: error.code || 'API_ERROR',
      message: error.message,
      details: error.details
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired.'
    });
  }

  // Handle unexpected errors
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'An unexpected error occurred.',
    details: process.env.NODE_ENV === 'development' ? {
      name: error.name,
      stack: error.stack
    } : undefined
  });
};



