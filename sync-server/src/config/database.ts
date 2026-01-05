// Database connection management
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';

// Create Prisma client with connection pooling and logging
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
  // Connection pool configuration
  // Note: Prisma uses connection pooling by default
  // Adjust DATABASE_URL with connection_limit parameter if needed
  // e.g., postgresql://user:pass@localhost:5432/db?connection_limit=10
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug(
      {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      },
      'Database Query'
    );
  });
}

// Log database errors
prisma.$on('error', (e: any) => {
  logger.error({ error: e }, 'Database Error');
});

// Log database warnings
prisma.$on('warn', (e: any) => {
  logger.warn({ warning: e }, 'Database Warning');
});

// Test database connection
export async function connectDatabase(): Promise<boolean> {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection established successfully');
    return true;
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      'Failed to connect to database'
    );
    return false;
  }
}

// Graceful disconnect
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error: any) {
    logger.error(
      { error: error.message },
      'Error disconnecting from database'
    );
  }
}

// Health check for database
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return { healthy: true, latency };
  } catch (error: any) {
    const latency = Date.now() - start;
    return {
      healthy: false,
      latency,
      error: error.message,
    };
  }
}

// Retry logic for database operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      logger.warn(
        {
          attempt,
          maxRetries,
          error: error.message,
        },
        'Database operation failed, retrying...'
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
