import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Enhanced Health Check and Monitoring
 * Provides detailed system status information
 */

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latency?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    activeConnections?: number;
  };
}

/**
 * Detailed health check endpoint
 */
export const healthCheck = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Test database connection
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency: number | undefined;
    let dbError: string | undefined;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'up';
    } catch (error: any) {
      dbError = error.message;
      logger.error({ error: error.message }, 'Database health check failed');
    }

    // Get memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal;
    const usedMemory = memUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (dbStatus === 'down') {
      overallStatus = 'unhealthy';
    } else if (dbLatency && dbLatency > 1000) {
      overallStatus = 'degraded';
    } else if (memoryPercentage > 90) {
      overallStatus = 'degraded';
    }

    const healthData: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: {
          status: dbStatus,
          latency: dbLatency,
          error: dbError,
        },
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: memoryPercentage,
        },
      },
    };

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthData);

    // Log if degraded or unhealthy
    if (overallStatus !== 'healthy') {
      logger.warn({ health: healthData }, 'System health check warning');
    }
  } catch (error: any) {
    logger.error({ error: error.message }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};

/**
 * Get system metrics for monitoring
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    const [
      totalCompanies,
      activeCompanies,
      totalStores,
      totalUsers,
      todaySales,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { status: 'active' } }),
      prisma.store.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.sale.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
          status: 'completed',
        },
      }),
    ]);

    // Get subscriptions expiring soon (next 7 days)
    const expiringSoon = await prisma.subscription.count({
      where: {
        status: 'active',
        currentPeriodEnd: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    });

    // Get expired trials
    const expiredTrials = await prisma.subscription.count({
      where: {
        plan: 'trial',
        trialEndsAt: {
          lt: new Date(),
        },
      },
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          inactive: totalCompanies - activeCompanies,
        },
        stores: {
          total: totalStores,
        },
        users: {
          total: totalUsers,
        },
        sales: {
          today: todaySales,
        },
        subscriptions: {
          expiringSoon,
          expiredTrials,
        },
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get metrics');
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to log slow requests
 */
export const logSlowRequests = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: Function) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        logger.warn(
          {
            method: req.method,
            url: req.url,
            duration,
            statusCode: res.statusCode,
          },
          'Slow request detected'
        );
      }
    });

    next();
  };
};

/**
 * Get critical alerts (for monitoring dashboards)
 */
export const getCriticalAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = [];

    // Check for expired trials still active
    const activeExpiredTrials = await prisma.company.count({
      where: {
        status: 'active',
        subscriptions: {
          some: {
            plan: 'trial',
            trialEndsAt: {
              lt: new Date(),
            },
          },
        },
      },
    });

    if (activeExpiredTrials > 0) {
      alerts.push({
        severity: 'warning',
        type: 'EXPIRED_TRIALS',
        message: `${activeExpiredTrials} company(ies) with expired trials still active`,
        count: activeExpiredTrials,
      });
    }

    // Check for companies near store limit
    const companiesNearLimit = await prisma.$queryRaw`
      SELECT c.id, c.name, c."maxStores", COUNT(s.id) as "storeCount"
      FROM "Company" c
      LEFT JOIN "Store" s ON s."companyId" = c.id AND s."isActive" = true
      WHERE c.status = 'active'
      GROUP BY c.id
      HAVING COUNT(s.id) >= c."maxStores" * 0.9
    `;

    if (Array.isArray(companiesNearLimit) && companiesNearLimit.length > 0) {
      alerts.push({
        severity: 'info',
        type: 'STORE_LIMIT_WARNING',
        message: `${companiesNearLimit.length} company(ies) near store limit`,
        count: companiesNearLimit.length,
      });
    }

    // Check database size (if available)
    try {
      const dbSize: any = await prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;
      
      if (dbSize && dbSize[0]) {
        alerts.push({
          severity: 'info',
          type: 'DATABASE_SIZE',
          message: `Database size: ${dbSize[0].size}`,
        });
      }
    } catch (e) {
      // Ignore if query fails
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      alerts,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get critical alerts');
    res.status(500).json({ error: 'Internal server error' });
  }
};
