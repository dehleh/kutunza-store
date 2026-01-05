import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

/**
 * Subscription Enforcement Middleware
 * Validates company subscription status and usage limits
 */

// Extend Express Request to include company info
declare global {
  namespace Express {
    interface Request {
      company?: any;
    }
  }
}

/**
 * Middleware to check if company's subscription is active
 * Use this on store-level routes that require active subscription
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return next(); // Skip if no storeId (not a store-level route)
    }

    // Get store with company and subscription info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        company: {
          include: {
            subscriptions: {
              where: { status: 'active' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const company = store.company;

    // Check if company is active
    if (!company.isActive || company.status !== 'active') {
      logger.warn(
        { companyId: company.id, status: company.status },
        'Access denied: Company account suspended or inactive'
      );
      return res.status(403).json({
        error: 'Access denied: Company account is suspended or inactive',
        code: 'COMPANY_SUSPENDED',
      });
    }

    // Check if there's an active subscription
    const activeSubscription = company.subscriptions[0];
    if (!activeSubscription) {
      logger.warn({ companyId: company.id }, 'Access denied: No active subscription');
      return res.status(403).json({
        error: 'Access denied: No active subscription',
        code: 'NO_SUBSCRIPTION',
      });
    }

    // Check if trial has expired
    if (
      activeSubscription.trialEndsAt &&
      new Date() > new Date(activeSubscription.trialEndsAt) &&
      activeSubscription.plan === 'trial'
    ) {
      logger.warn(
        { companyId: company.id, trialEndsAt: activeSubscription.trialEndsAt },
        'Access denied: Trial period expired'
      );
      return res.status(403).json({
        error: 'Access denied: Trial period has expired. Please upgrade your subscription.',
        code: 'TRIAL_EXPIRED',
        trialEndsAt: activeSubscription.trialEndsAt,
      });
    }

    // Check if subscription period has ended
    if (new Date() > new Date(activeSubscription.currentPeriodEnd)) {
      logger.warn(
        { companyId: company.id, periodEnd: activeSubscription.currentPeriodEnd },
        'Access denied: Subscription period ended'
      );
      return res.status(403).json({
        error: 'Access denied: Subscription period has ended. Please renew.',
        code: 'SUBSCRIPTION_EXPIRED',
        periodEnd: activeSubscription.currentPeriodEnd,
      });
    }

    // Attach company info to request for downstream use
    req.company = company;

    next();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Subscription check failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if company can add more stores
 * Use this when creating new stores
 */
export const checkStoreLimitNotExceeded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' });
    }

    const [company, storeCount] = await Promise.all([
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.store.count({ where: { companyId, isActive: true } }),
    ]);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (storeCount >= company.maxStores) {
      logger.warn(
        { companyId, currentStores: storeCount, maxStores: company.maxStores },
        'Store limit exceeded'
      );
      return res.status(403).json({
        error: `Store limit reached. Your plan allows ${company.maxStores} store(s). Please upgrade to add more.`,
        code: 'STORE_LIMIT_EXCEEDED',
        currentStores: storeCount,
        maxStores: company.maxStores,
      });
    }

    next();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Store limit check failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if company can add more users
 * Use this when creating new users
 */
export const checkUserLimitNotExceeded = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { storeId } = req.params;

    if (!storeId) {
      return res.status(400).json({ error: 'Store ID required' });
    }

    // Get store with company info
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: { company: true },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const company = store.company;

    // Count all active users across all company stores
    const userCount = await prisma.user.count({
      where: {
        store: { companyId: company.id },
        isActive: true,
      },
    });

    if (userCount >= company.maxUsers) {
      logger.warn(
        { companyId: company.id, currentUsers: userCount, maxUsers: company.maxUsers },
        'User limit exceeded'
      );
      return res.status(403).json({
        error: `User limit reached. Your plan allows ${company.maxUsers} user(s). Please upgrade to add more.`,
        code: 'USER_LIMIT_EXCEEDED',
        currentUsers: userCount,
        maxUsers: company.maxUsers,
      });
    }

    next();
  } catch (error: any) {
    logger.error({ error: error.message }, 'User limit check failed');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get subscription status for a company
 * Useful for dashboard displays
 */
export const getSubscriptionStatus = async (companyId: string) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            stores: { where: { isActive: true } },
          },
        },
      },
    });

    if (!company) {
      return null;
    }

    const subscription = company.subscriptions[0];
    const storeCount = company._count.stores;

    // Count users across all stores
    const userCount = await prisma.user.count({
      where: {
        store: { companyId },
        isActive: true,
      },
    });

    const now = new Date();
    const isTrialExpired =
      subscription?.trialEndsAt && now > new Date(subscription.trialEndsAt);
    const isPeriodExpired =
      subscription && now > new Date(subscription.currentPeriodEnd);

    return {
      company: {
        id: company.id,
        name: company.name,
        status: company.status,
        plan: company.plan,
      },
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            billingCycle: subscription.billingCycle,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            trialEndsAt: subscription.trialEndsAt,
            isTrialExpired,
            isPeriodExpired,
            daysUntilExpiry: subscription.trialEndsAt
              ? Math.ceil(
                  (new Date(subscription.trialEndsAt).getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : null,
          }
        : null,
      usage: {
        stores: {
          current: storeCount,
          max: company.maxStores,
          available: company.maxStores - storeCount,
          percentage: Math.round((storeCount / company.maxStores) * 100),
        },
        users: {
          current: userCount,
          max: company.maxUsers,
          available: company.maxUsers - userCount,
          percentage: Math.round((userCount / company.maxUsers) * 100),
        },
      },
      warnings: [
        ...(isTrialExpired ? ['Trial period has expired'] : []),
        ...(isPeriodExpired ? ['Subscription period has expired'] : []),
        ...(storeCount >= company.maxStores ? ['Store limit reached'] : []),
        ...(userCount >= company.maxUsers ? ['User limit reached'] : []),
      ],
    };
  } catch (error: any) {
    logger.error({ error: error.message, companyId }, 'Failed to get subscription status');
    return null;
  }
};
