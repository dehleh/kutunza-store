// Zod validation schemas for API requests
import { z } from 'zod';

// Sync push request schema
export const syncPushSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  changes: z.array(
    z.object({
      tableName: z.enum([
        'Product',
        'Category',
        'Sale',
        'Customer',
        'User',
        'Setting',
        'StockMovement',
      ]),
      recordId: z.string(),
      operation: z.enum(['create', 'update', 'delete']),
      syncId: z.string().uuid('Invalid sync ID format'),
      data: z.record(z.string(), z.any()).optional(),
    })
  ),
});

// Sync pull request schema
export const syncPullSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
  lastSyncTime: z.string().datetime().optional(),
});

// Analytics request schema
export const analyticsParamsSchema = z.object({
  storeId: z.string().uuid('Invalid store ID format'),
});

export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Product data schema (for sync validation)
export const productDataSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().positive('Selling price must be greater than 0'),
  taxRate: z.number().nonnegative().max(100),
  trackStock: z.boolean().default(true),
  stockQuantity: z.number().int().nonnegative().default(0),
  lowStockAlert: z.number().int().nonnegative().default(10),
  unit: z.string().default('pcs'),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

// Category data schema
export const categoryDataSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').default('#8B4513'),
  icon: z.string().optional(),
  sortOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

// Customer data schema
export const customerDataSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  loyaltyPoints: z.number().int().nonnegative().default(0),
  totalSpent: z.number().nonnegative().default(0),
  visitCount: z.number().int().nonnegative().default(0),
});

// Sale data schema
export const saleDataSchema = z.object({
  receiptNo: z.string().min(1),
  userId: z.string().uuid(),
  sessionId: z.string(),
  customerId: z.string().uuid().optional(),
  subtotal: z.number().nonnegative(),
  taxAmount: z.number().nonnegative().default(0),
  discountAmount: z.number().nonnegative().default(0),
  discountType: z.string().optional(),
  totalAmount: z.number().nonnegative(),
  paymentMethod: z.string().min(1),
  amountPaid: z.number().nonnegative(),
  changeGiven: z.number().nonnegative().default(0),
  status: z.string().default('completed'),
  notes: z.string().optional(),
});

// User data schema
export const userDataSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  pin: z.string().length(4, 'PIN must be exactly 4 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'cashier']).default('cashier'),
  isActive: z.boolean().default(true),
});

// Setting data schema
export const settingDataSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
  category: z.enum(['general', 'receipt', 'payment', 'tax', 'hardware']).default('general'),
});

// Stock movement data schema
export const stockMovementDataSchema = z.object({
  productId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['adjustment', 'sale', 'return', 'transfer', 'initial']),
  quantity: z.number().int(),
  previousQty: z.number().int().nonnegative(),
  newQty: z.number().int().nonnegative(),
  reason: z.string().optional(),
  reference: z.string().optional(),
});

// Validation helper
export type ValidatedData<T extends z.ZodType> = z.infer<T>;
