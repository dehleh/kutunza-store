// Authentication middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Extend Express Request to include authenticated data
export interface AuthRequest extends Request {
  storeId?: string;
  userId?: string;
}

// API Key authentication middleware
export const authenticateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey) {
    logger.warn({ path: req.path, ip: req.ip }, 'Missing API key');
    return res.status(401).json({ error: 'API key required' });
  }

  if (apiKey !== env.API_KEY) {
    logger.warn({ path: req.path, ip: req.ip }, 'Invalid API key');
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

// JWT authentication middleware (for future use with store-specific tokens)
export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    logger.warn({ path: req.path, ip: req.ip }, 'Missing JWT token');
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      storeId: string;
      userId: string;
    };

    req.storeId = decoded.storeId;
    req.userId = decoded.userId;

    next();
  } catch (error: any) {
    logger.warn(
      { path: req.path, ip: req.ip, error: error.message },
      'Invalid JWT token'
    );
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Store ID validation middleware
export const validateStoreAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const requestedStoreId = req.body.storeId || req.params.storeId;

  // If using JWT, ensure the store ID matches the token
  if (req.storeId && requestedStoreId && req.storeId !== requestedStoreId) {
    logger.warn(
      {
        authenticatedStoreId: req.storeId,
        requestedStoreId,
        ip: req.ip,
      },
      'Store ID mismatch'
    );
    return res.status(403).json({ error: 'Access denied to this store' });
  }

  next();
};

// Generate JWT token (utility for POS systems to authenticate)
export const generateToken = (storeId: string, userId: string): string => {
  return jwt.sign({ storeId, userId }, env.JWT_SECRET, {
    expiresIn: '7d', // Token valid for 7 days
  });
};
