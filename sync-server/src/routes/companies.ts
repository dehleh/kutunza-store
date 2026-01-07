import { Router, Request, Response, NextFunction } from 'express';
import { prisma, withRetry } from '../config/database';
import { logger } from '../config/logger';
import { getSubscriptionStatus } from '../middleware/subscription';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

// Type for PlatformAdmin with company included
type PlatformAdminWithCompany = Prisma.PlatformAdminGetPayload<{
  include: { company: true };
}>;

const router = Router();

// Extend Express Request type to include platformAdmin
declare global {
  namespace Express {
    interface Request {
      platformAdmin?: any; // Will be properly typed once Prisma generates the client
    }
  }
}

// ==================== VALIDATION SCHEMAS ====================

const createCompanySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  taxId: z.string().optional(),
  plan: z.enum(['trial', 'basic', 'pro', 'enterprise']).default('trial'),
  
  // Initial admin user
  adminFirstName: z.string().min(1),
  adminLastName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  
  // Initial store (optional)
  storeName: z.string().optional(),
  storeAddress: z.string().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  taxId: z.string().optional(),
  plan: z.enum(['trial', 'basic', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'cancelled']).optional(),
  maxStores: z.number().int().min(1).optional(),
  maxUsers: z.number().int().min(1).optional(),
  billingEmail: z.string().email().optional(),
  billingAddress: z.string().optional(),
});

const platformAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ==================== AUTHENTICATION ====================

// Middleware to authenticate platform admin
const authenticatePlatformAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    if (decoded.type !== 'platform_admin') {
      return res.status(403).json({ error: 'Forbidden: Platform admin access required' });
    }

    // Load admin details
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: decoded.adminId },
      include: { company: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'Forbidden: Admin account not found or inactive' });
    }

    req.platformAdmin = admin;
    next();
  } catch (error: any) {
    logger.error({ error: error.message }, 'Platform admin authentication failed');
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware to check super admin permissions
const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (req.platformAdmin.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden: Super admin access required' });
  }
  next();
};

// ==================== PUBLIC ROUTES ====================

// Platform admin login (mounted at /api/platform)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = platformAdminLoginSchema.parse(req.body);

    const admin = await withRetry(() =>
      prisma.platformAdmin.findUnique({
        where: { email },
        include: { company: true },
      })
    ) as PlatformAdminWithCompany | null;

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        type: 'platform_admin',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        companyId: admin.companyId,
        company: admin.company,
        permissions: {
          canManageCompanies: admin.canManageCompanies,
          canManageBilling: admin.canManageBilling,
          canViewAllStores: admin.canViewAllStores,
        },
      },
    });

    logger.info({ adminId: admin.id, email: admin.email }, 'Platform admin logged in');
  } catch (error: any) {
    logger.error({ error: error.message }, 'Platform admin login failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMPANY ONBOARDING ====================

// Create new company (public endpoint for self-service signup)
// Mounted at /api/companies/register
router.post('/register', async (req, res) => {
  try {
    const data = createCompanySchema.parse(req.body);

    // Generate unique slug from company name
    const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    
    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Check if email already exists
    const existingCompany = await prisma.company.findUnique({
      where: { email: data.email },
    });

    if (existingCompany) {
      return res.status(400).json({ error: 'Company email already registered' });
    }

    // Check if admin email already exists
    const existingAdmin = await prisma.platformAdmin.findUnique({
      where: { email: data.adminEmail },
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin email already registered' });
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(data.adminPassword, 12);

    // Calculate trial end date (14 days)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const currentPeriodEnd = new Date(trialEndsAt);

    // Create company with admin and initial store in a transaction
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: data.name,
          slug,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website,
          taxId: data.taxId,
          plan: data.plan,
          status: 'active',
        },
      });

      // Create platform admin
      const admin = await tx.platformAdmin.create({
        data: {
          companyId: company.id,
          email: data.adminEmail,
          password: hashedPassword,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: 'company_admin',
          canManageCompanies: false,
          canManageBilling: true,
          canViewAllStores: true,
        },
      });

      // Create initial subscription
      const subscription = await tx.subscription.create({
        data: {
          companyId: company.id,
          plan: data.plan,
          status: 'active',
          billingCycle: 'monthly',
          amount: 0, // Free trial
          currency: 'USD',
          currentPeriodStart: new Date(),
          currentPeriodEnd,
          trialEndsAt,
        },
      });

      // Create initial store if provided
      let store = null;
      if (data.storeName) {
        store = await tx.store.create({
          data: {
            companyId: company.id,
            name: data.storeName,
            code: 'MAIN',
            address: data.storeAddress,
            email: data.email,
          },
        });
      }

      return { company, admin, subscription, store };
    });

    logger.info(
      { companyId: result.company.id, adminEmail: data.adminEmail },
      'New company registered'
    );

    res.status(201).json({
      success: true,
      message: 'Company registered successfully',
      data: {
        company: {
          id: result.company.id,
          name: result.company.name,
          slug: result.company.slug,
          email: result.company.email,
          plan: result.company.plan,
        },
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          firstName: result.admin.firstName,
          lastName: result.admin.lastName,
        },
        store: result.store ? {
          id: result.store.id,
          name: result.store.name,
          code: result.store.code,
        } : null,
        trialEndsAt: result.subscription.trialEndsAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    logger.error({ error: error.message }, 'Company registration failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROTECTED COMPANY ROUTES ====================

// List all companies (super admin only)
router.get('/', authenticatePlatformAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { search, status, plan, page = '1', limit = '50' } = req.query;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (status) where.status = status;
    if (plan) where.plan = plan;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [companies, total] = await withRetry(() =>
      Promise.all([
        prisma.company.findMany({
          where,
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
          include: {
            _count: {
              select: { stores: true, platformAdmins: true },
            },
            subscriptions: {
              where: { status: 'active' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.company.count({ where }),
      ])
    );

    res.json({
      success: true,
      data: companies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to list companies');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single company
router.get('/:companyId', authenticatePlatformAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const admin = req.platformAdmin;

    // Check access: super admin or company admin for their own company
    if (admin.role !== 'super_admin' && admin.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const company = await withRetry(() =>
      prisma.company.findUnique({
        where: { id: companyId },
        include: {
          stores: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
              isActive: true,
              createdAt: true,
            },
          },
          platformAdmins: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: { stores: true, platformAdmins: true },
          },
        },
      })
    );

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get company');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update company
router.put('/:companyId', authenticatePlatformAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const admin = req.platformAdmin;
    const updates = updateCompanySchema.parse(req.body);

    // Check access
    if (admin.role !== 'super_admin' && admin.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    // Only super admin can change plan, status, limits
    if (admin.role !== 'super_admin') {
      delete (updates as any).plan;
      delete (updates as any).status;
      delete (updates as any).maxStores;
      delete (updates as any).maxUsers;
    }

    const company = await withRetry(() =>
      prisma.company.update({
        where: { id: companyId },
        data: updates,
      })
    );

    logger.info({ companyId, adminId: admin.id }, 'Company updated');

    res.json({ success: true, data: company });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    logger.error({ error: error.message }, 'Failed to update company');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Suspend company (super admin only)
router.post('/:companyId/suspend', authenticatePlatformAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await withRetry(() =>
      prisma.company.update({
        where: { id: companyId },
        data: { status: 'suspended', isActive: false },
      })
    );

    logger.warn({ companyId, adminId: req.platformAdmin.id }, 'Company suspended');

    res.json({ success: true, message: 'Company suspended', data: company });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to suspend company');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reactivate company (super admin only)
router.post('/:companyId/reactivate', authenticatePlatformAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;

    const company = await withRetry(() =>
      prisma.company.update({
        where: { id: companyId },
        data: { status: 'active', isActive: true },
      })
    );

    logger.info({ companyId, adminId: req.platformAdmin.id }, 'Company reactivated');

    res.json({ success: true, message: 'Company reactivated', data: company });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to reactivate company');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get company statistics (for dashboards)
router.get('/:companyId/stats', authenticatePlatformAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const admin = req.platformAdmin;

    // Check access
    if (admin.role !== 'super_admin' && admin.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const [storeCount, userCount, productCount, salesCount, totalRevenue] = await Promise.all([
      prisma.store.count({ where: { companyId, isActive: true } }),
      prisma.user.count({
        where: {
          store: { companyId },
          isActive: true,
        },
      }),
      prisma.product.count({
        where: {
          store: { companyId },
          isActive: true,
        },
      }),
      prisma.sale.count({
        where: {
          store: { companyId },
          status: 'completed',
        },
      }),
      prisma.sale.aggregate({
        where: {
          store: { companyId },
          status: 'completed',
        },
        _sum: { totalAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stores: storeCount,
        users: userCount,
        products: productCount,
        sales: salesCount,
        totalRevenue: totalRevenue._sum?.totalAmount || 0,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get company stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get subscription status and usage details
router.get('/:companyId/subscription', authenticatePlatformAdmin, async (req, res) => {
  try {
    const { companyId } = req.params;
    const admin = req.platformAdmin;

    // Check access
    if (admin.role !== 'super_admin' && admin.companyId !== companyId) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    const subscriptionStatus = await getSubscriptionStatus(companyId);

    if (!subscriptionStatus) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ success: true, data: subscriptionStatus });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get subscription status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
