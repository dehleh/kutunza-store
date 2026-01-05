import { Router } from 'express';
import { logger } from '../config/logger';
import { authenticateApiKey, validateStoreAccess } from '../middleware/auth';
import { AuditLogger } from '../services/auditLogger';

const router = Router();

// Get audit logs
router.get(
  '/:storeId/audit-logs',
  authenticateApiKey,
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const {
        userId,
        entityType,
        action,
        startDate,
        endDate,
        page = '1',
        limit = '100',
      } = req.query;

      const filters: any = {
        storeId,
        userId: userId as string,
        entityType: entityType as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: (parseInt(page as string) - 1) * parseInt(limit as string),
      };

      const { logs, total } = await AuditLogger.query(filters);

      res.json({
        success: true,
        data: logs,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch audit logs');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
