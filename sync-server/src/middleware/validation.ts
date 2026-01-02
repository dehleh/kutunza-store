// Request validation middleware using Zod
import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config/logger';

// Generic validation middleware
export const validate = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { path: req.path, errors, body: req.body },
          'Validation failed'
        );

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }

      logger.error({ error }, 'Unexpected validation error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Validate URL parameters
export const validateParams = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { path: req.path, errors, params: req.params },
          'Parameter validation failed'
        );

        return res.status(400).json({
          error: 'Invalid parameters',
          details: errors,
        });
      }

      logger.error({ error }, 'Unexpected validation error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Validate query parameters
export const validateQuery = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn(
          { path: req.path, errors, query: req.query },
          'Query validation failed'
        );

        return res.status(400).json({
          error: 'Invalid query parameters',
          details: errors,
        });
      }

      logger.error({ error }, 'Unexpected validation error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};
