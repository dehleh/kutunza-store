import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface AuditLogData {
  storeId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export class AuditLogger {
  /**
   * Log an action to the audit trail
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          storeId: data.storeId,
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata || {},
        },
      });

      logger.info(
        {
          action: data.action,
          entityType: data.entityType,
          userId: data.userId,
        },
        'Audit log created'
      );
    } catch (error: any) {
      logger.error({ error: error.message, data }, 'Failed to create audit log');
      // Don't throw - audit logging should not break operations
    }
  }

  /**
   * Log inventory changes
   */
  static async logInventoryChange(
    storeId: string,
    userId: string,
    productId: string,
    oldQty: number,
    newQty: number,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      storeId,
      userId,
      action: 'INVENTORY_ADJUSTMENT',
      entityType: 'Product',
      entityId: productId,
      changes: {
        field: 'stockQuantity',
        oldValue: oldQty,
        newValue: newQty,
      },
      ipAddress,
      metadata: { reason },
    });
  }

  /**
   * Log sale void/return
   */
  static async logSaleVoid(
    storeId: string,
    userId: string,
    saleId: string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      storeId,
      userId,
      action: 'SALE_VOID',
      entityType: 'Sale',
      entityId: saleId,
      ipAddress,
      metadata: { reason },
    });
  }

  /**
   * Log discount application
   */
  static async logDiscount(
    storeId: string,
    userId: string,
    saleId: string,
    discountAmount: number,
    discountType: string,
    reason?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      storeId,
      userId,
      action: 'DISCOUNT_APPLIED',
      entityType: 'Sale',
      entityId: saleId,
      ipAddress,
      metadata: {
        discountAmount,
        discountType,
        reason,
      },
    });
  }

  /**
   * Log user actions (create, update, delete)
   */
  static async logUserAction(
    storeId: string,
    actorUserId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    targetUserId: string,
    changes?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      storeId,
      userId: actorUserId,
      action: `USER_${action}`,
      entityType: 'User',
      entityId: targetUserId,
      changes,
      ipAddress,
    });
  }

  /**
   * Log product changes
   */
  static async logProductChange(
    storeId: string,
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    productId: string,
    changes?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      storeId,
      userId,
      action: `PRODUCT_${action}`,
      entityType: 'Product',
      entityId: productId,
      changes,
      ipAddress,
    });
  }

  /**
   * Query audit logs with filters
   */
  static async query(filters: {
    storeId: string;
    userId?: string;
    entityType?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {
      storeId: filters.storeId,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }
}
