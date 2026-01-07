// Kutunza POS Cloud Sync Server
// Deployed on Railway with PostgreSQL

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import configuration and middleware
import { env } from './config/env';
import { logger, httpLogger } from './config/logger';
import {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  withRetry,
} from './config/database';
import {
  authenticateApiKey,
  validateStoreAccess,
} from './middleware/auth';
import { validate, validateParams, validateQuery } from './middleware/validation';
import {
  syncPushSchema,
  syncPullSchema,
  analyticsParamsSchema,
  analyticsQuerySchema,
} from './validators/schemas';
import { WebSocketServer } from './config/websocket';
import {
  apiLimiter,
  authLimiter,
  syncLimiter,
  reportLimiter,
} from './middleware/rateLimiter';

// Import route handlers
import productsRouter from './routes/products';
import usersRouter from './routes/users';
import salesRouter from './routes/sales';
import auditRouter from './routes/audit';
import companiesRouter from './routes/companies';
import {
  healthCheck,
  getMetrics,
  getCriticalAlerts,
  logSlowRequests,
} from './middleware/monitoring';

const app = express();
const httpServer = createServer(app);
const PORT = env.PORT;

// Initialize WebSocket server
const wsServer = new WebSocketServer(httpServer);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: env.ALLOWED_ORIGINS === '*' ? true : env.ALLOWED_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(httpLogger); // Log all HTTP requests
app.use(logSlowRequests(1000)); // Log requests taking > 1s

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    name: 'Kutunza POS Sync Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api',
      docs: 'https://github.com/dehleh/kutunza-store'
    }
  });
});

// Enhanced health check (no authentication required)
app.get('/health', healthCheck);

// Metrics endpoint (requires API key)
app.get('/api/metrics', authenticateApiKey, getMetrics);

// Critical alerts endpoint (requires API key)
app.get('/api/alerts', authenticateApiKey, getCriticalAlerts);

// ==================== API ROUTES ====================

// Mount route handlers
app.use('/api/auth', authLimiter, usersRouter); // Auth routes with strict rate limiting
app.use('/api/platform', authLimiter, companiesRouter); // Platform login with strict rate limiting
app.use('/api/companies', apiLimiter, companiesRouter); // Company management with standard rate limiting
app.use('/api', productsRouter); // Products CRUD
app.use('/api', usersRouter); // Users management
app.use('/api', salesRouter); // Sales and reports
app.use('/api', auditRouter); // Audit logs

// ==================== SYNC ENDPOINTS ====================

// Batch sync endpoint - receives changes from POS
app.post(
  '/api/sync/push',
  authenticateApiKey,
  validate(syncPushSchema),
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId, changes } = req.body;

      const results = {
        success: 0,
        failed: 0,
        conflicts: 0,
        errors: [] as any[],
      };

      for (const change of changes) {
        try {
          await withRetry(() => processSyncChange(storeId, change));
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push({
            change: change,
            error: error.message,
          });
          logger.error(
            { storeId, change, error: error.message },
            'Failed to process sync change'
          );
        }
      }

      logger.info(
        { storeId, results },
        'Sync push completed'
      );

      res.json({
        status: 'completed',
        results,
      });
    } catch (error: any) {
      logger.error({ storeId: req.body.storeId, error: error.message }, 'Sync push error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Pull changes from server
app.post(
  '/api/sync/pull',
  syncLimiter,
  authenticateApiKey,
  validate(syncPullSchema),
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId, lastSyncTime } = req.body;

      const since = lastSyncTime ? new Date(lastSyncTime) : new Date(0);

      // Fetch all changes since last sync
      const [products, categories, sales, customers, users, settings] = await withRetry(() =>
        Promise.all([
          prisma.product.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
          }),
          prisma.category.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
          }),
          prisma.sale.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
            include: {
              items: true,
              payments: true,
            },
          }),
          prisma.customer.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
          }),
          prisma.user.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
          }),
          prisma.setting.findMany({
            where: {
              storeId,
              updatedAt: { gt: since },
            },
          }),
        ])
      );

      logger.info(
        {
          storeId,
          counts: {
            products: products.length,
            categories: categories.length,
            sales: sales.length,
            customers: customers.length,
            users: users.length,
            settings: settings.length,
          },
        },
        'Sync pull completed'
      );

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        changes: {
          products,
          categories,
          sales,
          customers,
          users,
          settings,
        },
      });
    } catch (error: any) {
      logger.error({ storeId: req.body.storeId, error: error.message }, 'Sync pull error');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Process individual sync change
async function processSyncChange(storeId: string, change: any) {
  const { tableName, recordId, operation, data, syncId } = change;

  // Check if already synced (avoid duplicates)
  const existing = await prisma.syncLog.findUnique({
    where: { syncId },
  });

  if (existing) {
    return; // Already processed
  }

  // Add storeId to data
  const dataWithStore = { ...data, storeId };

  switch (tableName) {
    case 'Product':
      await handleProductSync(operation, recordId, dataWithStore);
      break;
    case 'Category':
      await handleCategorySync(operation, recordId, dataWithStore);
      break;
    case 'Sale':
      await handleSaleSync(operation, recordId, dataWithStore);
      break;
    case 'Customer':
      await handleCustomerSync(operation, recordId, dataWithStore);
      break;
    case 'User':
      await handleUserSync(operation, recordId, dataWithStore);
      break;
    case 'Setting':
      await handleSettingSync(operation, recordId, dataWithStore);
      break;
    case 'StockMovement':
      await handleStockMovementSync(operation, recordId, dataWithStore);
      break;
    default:
      throw new Error(`Unknown table: ${tableName}`);
  }

  // Log successful sync
  await prisma.syncLog.create({
    data: {
      syncId,
      storeId,
      tableName,
      recordId,
      operation,
      processedAt: new Date(),
    },
  });
}

// Table-specific sync handlers
async function handleProductSync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    await prisma.product.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  } else if (operation === 'delete') {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

async function handleCategorySync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    await prisma.category.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  } else if (operation === 'delete') {
    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}

async function handleSaleSync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    const { items, payments, ...saleData } = data;

    await prisma.sale.upsert({
      where: { id },
      create: {
        id,
        ...saleData,
        items: items ? {
          createMany: {
            data: items,
            skipDuplicates: true,
          },
        } : undefined,
        payments: payments ? {
          createMany: {
            data: payments,
            skipDuplicates: true,
          },
        } : undefined,
      },
      update: saleData,
    });
  }
}

async function handleCustomerSync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    await prisma.customer.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
}

async function handleUserSync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    await prisma.user.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
}

async function handleSettingSync(operation: string, id: string, data: any) {
  if (operation === 'create' || operation === 'update') {
    await prisma.setting.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }
}

async function handleStockMovementSync(operation: string, id: string, data: any) {
  if (operation === 'create') {
    await prisma.stockMovement.create({
      data: { id, ...data },
    });
  }
}

// ==================== REPORTS & ANALYTICS ====================

// Get store analytics
app.get(
  '/api/analytics/:storeId',
  reportLimiter,
  authenticateApiKey,
  validateParams(analyticsParamsSchema),
  validateQuery(analyticsQuerySchema),
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const [totalSales, topProducts] = await withRetry(() =>
        Promise.all([
          prisma.sale.aggregate({
            where: {
              storeId,
              createdAt: { gte: start, lte: end },
              status: 'completed',
            },
            _sum: { totalAmount: true },
            _count: true,
          }),
          prisma.saleItem.groupBy({
            by: ['productId'],
            where: {
              sale: {
                storeId,
                createdAt: { gte: start, lte: end },
                status: 'completed',
              },
            },
            _sum: {
              quantity: true,
              total: true,
            },
            orderBy: {
              _sum: {
                total: 'desc',
              },
            },
            take: 10,
          }),
        ])
      );

      logger.info({ storeId, period: { start, end } }, 'Analytics retrieved');

      res.json({
        period: { start, end },
        summary: {
          totalSales: totalSales._sum.totalAmount || 0,
          totalTransactions: totalSales._count || 0,
          averageSale:
            totalSales._count > 0
              ? (totalSales._sum.totalAmount || 0) / totalSales._count
              : 0,
        },
        topProducts,
      });
    } catch (error: any) {
      logger.error(
        { storeId: req.params.storeId, error: error.message },
        'Analytics error'
      );
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// WebSocket stats endpoint
app.get('/api/ws/stats', authenticateApiKey, (req, res) => {
  const stats = wsServer.getStats();
  res.json({
    success: true,
    data: stats,
  });
});

// Start server with database connection check
async function startServer() {
  // Test database connection before starting server
  const dbConnected = await connectDatabase();

  if (!dbConnected) {
    logger.fatal('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  httpServer.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        environment: env.NODE_ENV,
        nodeVersion: process.version,
        websocket: 'enabled',
      },
      '🚀 Kutunza POS Sync Server started successfully'
    );
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ error }, 'Uncaught Exception');
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
