import { Router } from 'express';
import { prisma, withRetry } from '../config/database';
import { logger } from '../config/logger';
import { authenticateApiKey, validateStoreAccess } from '../middleware/auth';
import { requireActiveSubscription, checkUserLimitNotExceeded } from '../middleware/subscription';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuditLogger } from '../services/auditLogger';

const router = Router();

// Validation schemas
const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  pin: z.string().length(4).regex(/^\d+$/),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['admin', 'manager', 'cashier']).default('cashier'),
});

const updateUserSchema = createUserSchema.partial();

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
  storeId: z.string().uuid(),
});

// Login endpoint
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password, storeId } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        username,
        storeId,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        storeId: user.storeId,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info({ userId: user.id, username }, 'User logged in');

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          storeId: user.storeId,
        },
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Login failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users
router.get(
  '/:storeId/users',
  authenticateApiKey,
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId } = req.params;

      const users = await withRetry(() =>
        prisma.user.findMany({
          where: { storeId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // Exclude password and pin
          },
          orderBy: { username: 'asc' },
        })
      );

      res.json({ success: true, data: users });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch users');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get single user
router.get(
  '/:storeId/users/:userId',
  authenticateApiKey,
  validateStoreAccess,
  async (req, res) => {
    try {
      const { storeId, userId } = req.params;

      const user = await withRetry(() =>
        prisma.user.findFirst({
          where: { id: userId, storeId },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create user
router.post(
  '/:storeId/users',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  checkUserLimitNotExceeded,
  validate(createUserSchema),
  async (req, res) => {
    try {
      const { storeId } = req.params;
      const actorUserId = (req as any).userId || 'system';
      const { password, pin, ...userData } = req.body;

      // Hash password and pin
      const hashedPassword = await bcrypt.hash(password, 12);
      const hashedPin = await bcrypt.hash(pin, 12);

      const user = await withRetry(() =>
        prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            pin: hashedPin,
            storeId,
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        })
      );

      // Audit log
      await AuditLogger.logUserAction(
        storeId,
        actorUserId,
        'CREATE',
        user.id,
        { username: user.username, role: user.role },
        req.ip
      );

      logger.info({ userId: user.id }, 'User created');
      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Username already exists' });
      }
      logger.error({ error: error.message }, 'Failed to create user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update user
router.put(
  '/:storeId/users/:userId',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  validate(updateUserSchema),
  async (req, res) => {
    try {
      const { storeId, userId } = req.params;
      const actorUserId = (req as any).userId || 'system';
      const { password, pin, ...userData } = req.body;

      const updateData: any = { ...userData };

      if (password) {
        updateData.password = await bcrypt.hash(password, 12);
      }

      if (pin) {
        updateData.pin = await bcrypt.hash(pin, 12);
      }

      const user = await withRetry(() =>
        prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            updatedAt: true,
          },
        })
      );

      // Audit log
      await AuditLogger.logUserAction(
        storeId,
        actorUserId,
        'UPDATE',
        user.id,
        { changes: userData },
        req.ip
      );

      logger.info({ userId }, 'User updated');
      res.json({ success: true, data: user });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to update user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete user (soft delete)
router.delete(
  '/:storeId/users/:userId',
  authenticateApiKey,
  validateStoreAccess,
  requireActiveSubscription,
  async (req, res) => {
    try {
      const { storeId, userId } = req.params;
      const actorUserId = (req as any).userId || 'system';

      const user = await withRetry(() =>
        prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
        })
      );

      // Audit log
      await AuditLogger.logUserAction(
        storeId,
        actorUserId,
        'DELETE',
        user.id,
        undefined,
        req.ip
      );

      logger.info({ userId }, 'User deleted');
      res.json({ success: true, message: 'User deleted' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to delete user');
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
