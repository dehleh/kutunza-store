import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      'Rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later',
    });
  },
});

// Stricter limiter for auth endpoints - 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later',
  handler: (req: Request, res: Response) => {
    logger.warn(
      { ip: req.ip, username: req.body?.username },
      'Auth rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Please try again after 15 minutes',
    });
  },
});

// Sync endpoint limiter - 50 requests per minute
export const syncLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: 'Too many sync requests',
  handler: (req: Request, res: Response) => {
    logger.warn(
      { ip: req.ip, storeId: req.body?.storeId },
      'Sync rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too many sync requests',
      message: 'Please slow down and try again',
    });
  },
});

// Report generation limiter - 10 per 5 minutes
export const reportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many report requests',
});

// Request size limiter middleware
export function requestSizeLimiter(maxSizeBytes: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      logger.warn(
        { ip: req.ip, size: contentLength, maxSize: maxSizeBytes },
        'Request size exceeded'
      );
      return res.status(413).json({
        error: 'Request too large',
        message: `Request body must be less than ${maxSizeBytes / 1024 / 1024}MB`,
      });
    }
    
    next();
  };
}
