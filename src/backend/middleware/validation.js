import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodSchema } from 'zod';

/**
 * Middleware factory for validating requests against a Zod schema
 * @param schema - Zod schema for validating request (body, query, params)
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const result = schema.parse({
        body.body,
        query.query,
        params.params
      });

      // Add validated data to request
      req.validated = result;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};



