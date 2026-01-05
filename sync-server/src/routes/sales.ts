import { Router } from 'express';
import { prisma, withRetry } from '../config/database';
import { logger } from '../config/logger';
import { authenticateApiKey, validateStoreAccess } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';
import { AuditLogger } from '../services/auditLogger';

const router = Router();

// Get sales with filters
router.get(
  '/:storeId/sales',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const {
        startDate,
        endDate,
        userId,
        status,
        page = '1',
        limit = '50',
      } = req.query;

      const where: any = { storeId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      if (userId) where.userId = userId;
      if (status) where.status = status;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const [sales, total] = await withRetry(() =>
        Promise.all([
          prisma.sale.findMany({
            where,
            include: {
              items: true,
              payments: true,
              user: {
                select: {
                  username: true,
                  firstName: true,
                  lastName: true,
                },
              },
              customer: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.sale.count({ where }),
        ])
      );

      res.json({
        success: true,
        data: sales,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch sales');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single sale
router.get(
  '/:storeId/sales/:saleId',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId, saleId } = req.params;

      const sale = await withRetry(() =>
        prisma.sale.findFirst({
          where: { id: saleId, storeId },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    sku: true,
                  },
                },
              },
            },
            payments: true,
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true,
              },
            },
            customer: true,
          },
        })
      );

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      res.json({ success: true, data: sale });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch sale');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Void sale
router.post(
  '/:storeId/sales/:saleId/void',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId, saleId } = req.params;
      const { reason } = req.body;
      const userId = (req as any).userId || 'system';

      if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
      }

      // Get sale with items
      const sale = await prisma.sale.findFirst({
        where: { id: saleId, storeId },
        include: { items: true },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      if (sale.status === 'voided') {
        return res.status(400).json({ error: 'Sale already voided' });
      }

      // Void sale and restore inventory
      await withRetry(() =>
        prisma.$transaction(async (tx) => {
          // Update sale status
          await tx.sale.update({
            where: { id: saleId },
            data: {
              status: 'voided',
              notes: `Voided: ${reason}`,
            },
          });

          // Restore inventory
          for (const item of sale.items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            });

            if (product && product.trackStock) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: {
                    increment: item.quantity,
                  },
                },
              });

              await tx.stockMovement.create({
                data: {
                  storeId,
                  productId: item.productId,
                  userId,
                  type: 'IN',
                  quantity: item.quantity,
                  previousQty: product.stockQuantity,
                  newQty: product.stockQuantity + item.quantity,
                  reason: `Sale void: ${saleId}`,
                  reference: saleId,
                },
              });
            }
          }
        })
      );

      // Audit log
      await AuditLogger.logSaleVoid(storeId, userId, saleId, reason, req.ip);

      logger.info({ saleId, reason }, 'Sale voided');
      res.json({ success: true, message: 'Sale voided successfully' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to void sale');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get sales report
router.get(
  '/:storeId/reports/sales',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const { startDate, endDate, groupBy = 'day' } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const sales = await withRetry(() =>
        prisma.sale.findMany({
          where: {
            storeId,
            createdAt: { gte: start, lte: end },
            status: 'completed',
          },
          include: {
            items: true,
            payments: true,
          },
        })
      );

      // Aggregate data
      const summary = {
        totalSales: sales.reduce((sum, s) => sum + s.totalAmount, 0),
        totalTransactions: sales.length,
        averageSale: sales.length > 0
          ? sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length
          : 0,
        totalItems: sales.reduce(
          (sum, s) => sum + s.items.reduce((isum, i) => isum + i.quantity, 0),
          0
        ),
        totalDiscount: sales.reduce((sum, s) => sum + s.discountAmount, 0),
        totalTax: sales.reduce((sum, s) => sum + s.taxAmount, 0),
      };

      // Payment method breakdown
      const paymentMethods = sales.reduce((acc: any, s) => {
        s.payments.forEach((p) => {
          if (!acc[p.method]) {
            acc[p.method] = { count: 0, amount: 0 };
          }
          acc[p.method].count++;
          acc[p.method].amount += p.amount;
        });
        return acc;
      }, {});

      // Top products
      const productStats = sales
        .flatMap((s) => s.items)
        .reduce((acc: any, item) => {
          if (!acc[item.productId]) {
            acc[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              revenue: 0,
            };
          }
          acc[item.productId].quantity += item.quantity;
          acc[item.productId].revenue += item.total;
          return acc;
        }, {});

      const topProducts = Object.values(productStats)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      res.json({
        success: true,
        data: {
          period: { start, end },
          summary,
          paymentMethods,
          topProducts,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate sales report');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
