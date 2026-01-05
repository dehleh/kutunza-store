# Kutunza POS - Multi-Tenancy Quick Reference

## API Endpoints Summary

### 🌐 Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/companies/register` | Register new company (self-service) |
| POST | `/api/platform/login` | Platform admin authentication |

### 🔐 Platform Admin Endpoints

Require: `Authorization: Bearer <platform-jwt>`

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/companies` | List all companies | Super Admin |
| GET | `/api/companies/:id` | Get company details | Super/Company Admin |
| PUT | `/api/companies/:id` | Update company | Super/Company Admin |
| POST | `/api/companies/:id/suspend` | Suspend company | Super Admin |
| POST | `/api/companies/:id/reactivate` | Reactivate company | Super Admin |
| GET | `/api/companies/:id/stats` | Company statistics | Super/Company Admin |

### 🏪 Existing Store Endpoints (Enhanced)

All existing endpoints still work, now with company validation:

```
GET /api/:storeId/products
GET /api/:storeId/users
GET /api/:storeId/sales
GET /api/:storeId/reports/sales
GET /api/:storeId/audit-logs
```

## Quick Start Commands

### 1. Create Super Admin
```bash
cd sync-server
node scripts/create-super-admin.js
# Or use Prisma Studio: npx prisma studio
```

### 2. Register First Company
```bash
curl -X POST http://localhost:5000/api/companies/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "email": "company@example.com",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "adminEmail": "john@example.com",
    "adminPassword": "SecurePass123!",
    "storeName": "Main Store"
  }'
```

### 3. Login as Platform Admin
```bash
curl -X POST http://localhost:5000/api/platform/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@platform.com",
    "password": "YourPassword"
  }'
```

### 4. Run Migration
```bash
cd sync-server
npx prisma migrate dev --name add-multi-tenancy
npm run generate
```

## Database Models

```
Company
  ├── id (uuid)
  ├── name
  ├── slug (unique)
  ├── email (unique)
  ├── plan (trial/basic/pro/enterprise)
  ├── status (active/suspended/cancelled)
  ├── maxStores
  └── maxUsers

PlatformAdmin
  ├── id (uuid)
  ├── companyId (nullable - null = super admin)
  ├── email (unique)
  ├── password (bcrypt)
  ├── role (super_admin/company_admin)
  └── permissions (boolean flags)

Subscription
  ├── id (uuid)
  ├── companyId
  ├── plan
  ├── status
  ├── billingCycle
  ├── amount
  └── trialEndsAt

Store (Updated)
  ├── id (uuid)
  ├── companyId ⬅️ NEW
  ├── name
  ├── code ⬅️ NEW
  └── ...
```

## Roles & Permissions

| Role | Can Do |
|------|--------|
| **Super Admin** | Manage all companies, suspend/reactivate, change plans, view all data |
| **Company Admin** | Manage their company, create stores, manage users, view billing |
| **Store Admin** | Manage their store, products, sales (existing role) |
| **Cashier** | Process sales, view products (existing role) |

## Subscription Plans

| Plan | Price | Stores | Users | Trial |
|------|-------|--------|-------|-------|
| Trial | Free | 1 | 5 | 14 days |
| Basic | $49/mo | 1 | 10 | - |
| Pro | $149/mo | 5 | 50 | - |
| Enterprise | Custom | ∞ | ∞ | - |

## Environment Variables

No new environment variables required! Uses existing:
- `JWT_SECRET` - Used for platform admin tokens
- `DATABASE_URL` - PostgreSQL connection
- `API_KEY` - Store-level API key (unchanged)

## Testing Checklist

- [ ] Create super admin
- [ ] Register test company
- [ ] Login as platform admin
- [ ] Create additional store for company
- [ ] List all companies
- [ ] Update company plan
- [ ] Suspend and reactivate company
- [ ] Verify existing store endpoints still work
- [ ] Check company statistics endpoint

## Common Issues

**Q: How do I create the first super admin?**  
A: Run the create-super-admin script in the migration guide, or use Prisma Studio to insert directly.

**Q: Can existing stores be migrated?**  
A: Yes, create a default company and update all stores to have that companyId.

**Q: Do I need to change POS web app?**  
A: No, POS app continues using store-level API keys. Company management is for platform admins only.

**Q: How does billing work?**  
A: Currently manual tracking via Subscription model. Integrate Stripe/PayPal for automated billing.

## Files Changed

- ✅ [schema.prisma](sync-server/prisma/schema.prisma) - Added Company, PlatformAdmin, Subscription models
- ✅ [companies.ts](sync-server/src/routes/companies.ts) - New company management routes
- ✅ [index.ts](sync-server/src/index.ts) - Mounted company routes
- ✅ [MULTI_TENANCY_GUIDE.md](MULTI_TENANCY_GUIDE.md) - Complete documentation

## Next Deploy

```bash
# 1. Update database
cd sync-server
npx prisma migrate deploy

# 2. Rebuild and restart
cd ..
docker-compose down
docker-compose build sync-server
docker-compose up -d

# 3. Create super admin
docker-compose exec sync-server node -e "/* super admin script */"
```

---

🎉 **Multi-tenancy ready!** Your POS system can now onboard multiple companies with multiple stores each.
