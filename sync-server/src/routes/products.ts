import { Router } from 'express';
import { prisma, withRetry } from '../config/database';
import { logger } from '../config/logger';
import { authenticateApiKey, validateStoreAccess } from '../middleware/auth';
import { requireActiveSubscription } from '../middleware/subscription';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import { AuditLogger } from '../services/auditLogger';
import { randomUUID } from 'crypto';

const router = Router();

// Validation schemas
const createProductSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  costPrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  trackStock: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockAlert: z.number().int().min(0).default(10),
  unit: z.string().default('pcs'),
  imageUrl: z.string().url().optional(),
});

const updateProductSchema = createProductSchema.partial();

const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// Get all products for a store
router.get(
  '/:storeId/products',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const {
        search,
        categoryId,
        isActive,
        page = '1',
        limit = '50',
      } = req.query;

      const where: any = { storeId };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { sku: { contains: search as string, mode: 'insensitive' } },
          { barcode: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (categoryId) where.categoryId = categoryId;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const [products, total] = await withRetry(() =>
        Promise.all([
          prisma.product.findMany({
            where,
            skip: (pageNum - 1) * limitNum,
            take: limitNum,
            orderBy: { name: 'asc' },
          }),
          prisma.product.count({ where }),
        ])
      );

      res.json({
        success: true,
        data: products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch products');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single product
router.get(
  '/:storeId/products/:productId',
  authenticateApiKey,
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId, productId } = req.params;

      const product = await withRetry(() =>
        prisma.product.findFirst({
          where: { id: productId, storeId },
        })
      );

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ success: true, data: product });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch product');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create product
router.post(
  '/:storeId/products',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  validate(createProductSchema),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const userId = (req as any).userId || 'system';

      const product = await withRetry(() =>
        prisma.product.create({
          data: {
            ...req.body,
            storeId,
          },
        })
      );

      // Audit log
      await AuditLogger.logProductChange(
        storeId,
        userId,
        'CREATE',
        product.id,
        { product },
        req.ip
      );

      logger.info({ productId: product.id }, 'Product created');
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to create product');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update product
router.put(
  '/:storeId/products/:productId',
  authenticateApiKey,
  validateStoreAccess,  requireActiveSubscription,  validate(updateProductSchema),
  async (req, res) => {
    try {
      const { storeId, productId } = req.params;
      const userId = (req as any).userId || 'system';

      // Get old product for audit
      const oldProduct = await prisma.product.findFirst({
        where: { id: productId, storeId },
      });

      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = await withRetry(() =>
        prisma.product.update({
          where: { id: productId },
          data: req.body,
        })
      );

      // Audit log
      await AuditLogger.logProductChange(
        storeId,
        userId,
        'UPDATE',
        product.id,
        { oldProduct, newProduct: product },
        req.ip
      );

      logger.info({ productId: product.id }, 'Product updated');
      res.json({ success: true, data: product });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to update product');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete (soft delete) product
router.delete(
  '/:storeId/products/:productId',
  authenticateApiKey,
  validateStoreAccess,  requireActiveSubscription,  async (req, res) => {
    try {
      const { storeId, productId } = req.params;
      const userId = (req as any).userId || 'system';

      const product = await withRetry(() =>
        prisma.product.update({
          where: { id: productId },
          data: { isActive: false },
        })
      );

      // Audit log
      await AuditLogger.logProductChange(
        storeId,
        userId,
        'DELETE',
        product.id,
        { product },
        req.ip
      );

      logger.info({ productId }, 'Product deleted');
      res.json({ success: true, message: 'Product deleted' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to delete product');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Adjust inventory
router.post(
  '/:storeId/products/:productId/adjust-stock',
  authenticateApiKey,
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId, productId } = req.params;
      const { quantity, reason } = req.body;
      const userId = (req as any).userId || 'system';

      if (typeof quantity !== 'number') {
        return res.status(400).json({ error: 'Quantity must be a number' });
      }

      const product = await prisma.product.findFirst({
        where: { id: productId, storeId },
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const oldQty = product.stockQuantity;
      const newQty = oldQty + quantity;

      // Update stock and create movement record
      const [updatedProduct] = await withRetry(() =>
        prisma.$transaction([
          prisma.product.update({
            where: { id: productId },
            data: { stockQuantity: newQty },
          }),
          prisma.stockMovement.create({
            data: {
              id: randomUUID(),
              storeId,
              productId,
              userId,
              type: quantity > 0 ? 'IN' : 'OUT',
              quantity: Math.abs(quantity),
              previousQty: oldQty,
              newQty,
              reason,
            },
          }),
        ])
      );

      // Audit log
      await AuditLogger.logInventoryChange(
        storeId,
        userId,
        productId,
        oldQty,
        newQty,
        reason,
        req.ip
      );

      logger.info({ productId, oldQty, newQty }, 'Stock adjusted');
      res.json({ success: true, data: updatedProduct });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to adjust stock');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
