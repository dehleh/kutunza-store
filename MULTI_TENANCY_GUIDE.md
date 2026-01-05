# Multi-Tenancy & SaaS Implementation Guide

## 🎯 Overview

The Kutunza POS system has been upgraded to support **multi-company/multi-tenant SaaS architecture**. This allows you to onboard multiple companies, each with multiple stores, all managed through a centralized platform.

## 🏗️ Architecture

### Hierarchy
```
Platform
  ├── Super Admin (manages platform)
  │
  ├── Company A (tenant)
  │   ├── Company Admin
  │   ├── Subscription (billing)
  │   ├── Store 1
  │   │   ├── Products
  │   │   ├── Staff Users
  │   │   ├── Sales
  │   │   └── Customers
  │   ├── Store 2
  │   └── Store 3
  │
  ├── Company B (tenant)
  │   ├── Company Admin
  │   ├── Subscription
  │   └── Store 1
  │
  └── Company C (tenant)
      └── ...
```

## 📊 Database Changes

### New Models Added

#### 1. **Company** (Top-level tenant)
- Represents an organization using the platform
- Has subscription plan (trial, basic, pro, enterprise)
- Can own multiple stores
- Fields: name, slug, email, plan, status, maxStores, maxUsers

#### 2. **PlatformAdmin** 
- Manages companies and platform
- Two roles:
  - `super_admin`: Full platform access
  - `company_admin`: Manages specific company
- Permissions: canManageCompanies, canManageBilling, canViewAllStores

#### 3. **Subscription**
- Tracks billing for each company
- Fields: plan, status, billingCycle, amount, trialEndsAt
- Statuses: active, past_due, cancelled, expired

#### 4. **Store** (Updated)
- Now belongs to a Company
- Added `companyId` foreign key
- Added `code`, `timezone`, `currency` fields

## 🔌 New API Endpoints

### Company Management

#### Public Endpoints

```http
POST /api/companies/register
```
Self-service company registration. Creates company, admin user, initial store, and trial subscription.

**Request Body:**
```json
{
  "name": "Acme Retail",
  "email": "info@acmeretail.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "website": "https://acmeretail.com",
  "adminFirstName": "John",
  "adminLastName": "Doe",
  "adminEmail": "john@acmeretail.com",
  "adminPassword": "SecurePass123!",
  "storeName": "Main Store",
  "storeAddress": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company registered successfully",
  "data": {
    "company": {
      "id": "uuid",
      "name": "Acme Retail",
      "slug": "acme-retail",
      "plan": "trial"
    },
    "admin": {
      "id": "uuid",
      "email": "john@acmeretail.com"
    },
    "store": {
      "id": "uuid",
      "name": "Main Store"
    },
    "trialEndsAt": "2026-01-16T00:00:00.000Z"
  }
}
```

---

```http
POST /api/platform/login
```
Platform admin authentication.

**Request Body:**
```json
{
  "email": "admin@platform.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "admin": {
    "id": "uuid",
    "email": "admin@platform.com",
    "role": "super_admin",
    "permissions": {
      "canManageCompanies": true,
      "canManageBilling": true,
      "canViewAllStores": true
    }
  }
}
```

#### Protected Endpoints (Platform Admin Only)

All require `Authorization: Bearer <platform-admin-jwt>` header.

```http
GET /api/companies
```
List all companies (super admin only). Supports filtering by status, plan, search.

---

```http
GET /api/companies/:companyId
```
Get company details with stores, admins, and subscription info.

---

```http
PUT /api/companies/:companyId
```
Update company details. Super admin can change plan/status. Company admin can update profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "plan": "pro",
  "maxStores": 10,
  "maxUsers": 50
}
```

---

```http
POST /api/companies/:companyId/suspend
```
Suspend company (super admin only).

---

```http
POST /api/companies/:companyId/reactivate
```
Reactivate suspended company (super admin only).

---

```http
GET /api/companies/:companyId/stats
```
Get company statistics (stores, users, products, sales, revenue).

**Response:**
```json
{
  "success": true,
  "data": {
    "stores": 5,
    "users": 23,
    "products": 450,
    "sales": 1234,
    "totalRevenue": 45678.90
  }
}
```

## 🚀 Migration Steps

### 1. Update Database Schema

```bash
cd sync-server

# Generate Prisma client with new models
npm run generate

# Create and apply migration
npx prisma migrate dev --name add-multi-tenancy
```

### 2. Create Initial Super Admin

Run this script to create your platform super admin:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createSuperAdmin() {
  const hashedPassword = await bcrypt.hash('YourSecurePassword123!', 12);
  
  const admin = await prisma.platformAdmin.create({
    data: {
      email: 'admin@yourplatform.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      canManageCompanies: true,
      canManageBilling: true,
      canViewAllStores: true,
    },
  });
  
  console.log('Super admin created:', admin.email);
  await prisma.\$disconnect();
}

createSuperAdmin();
"
```

### 3. Migrate Existing Data (If Any)

If you have existing stores without companies:

```sql
-- Create a default company
INSERT INTO "Company" (id, name, slug, email, plan, status)
VALUES ('default-company-id', 'Default Company', 'default', 'admin@example.com', 'enterprise', 'active');

-- Update existing stores to belong to default company
UPDATE "Store"
SET "companyId" = 'default-company-id'
WHERE "companyId" IS NULL;
```

### 4. Update Environment Variables

No additional environment variables needed. Existing JWT_SECRET is used for platform admin tokens.

### 5. Restart Server

```bash
# If using Docker
docker-compose restart sync-server

# Or if running locally
npm run dev
```

## 📱 Frontend Integration

### Company Registration Flow

```typescript
// Register new company
const registerCompany = async (data: CompanyRegistration) => {
  const response = await fetch('/api/companies/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  return response.json();
};
```

### Platform Admin Login

```typescript
// Platform admin authentication
const platformLogin = async (email: string, password: string) => {
  const response = await fetch('/api/platform/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  // Store token for future requests
  localStorage.setItem('platformToken', data.token);
  
  return data.admin;
};
```

### Company Management

```typescript
// List all companies (super admin)
const fetchCompanies = async () => {
  const token = localStorage.getItem('platformToken');
  
  const response = await fetch('/api/companies', {
    headers: { 
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};

// Get company details
const fetchCompany = async (companyId: string) => {
  const token = localStorage.getItem('platformToken');
  
  const response = await fetch(`/api/companies/${companyId}`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

## 🔐 Security & Permissions

### Access Control Matrix

| Action | Super Admin | Company Admin | Store User |
|--------|-------------|---------------|------------|
| Create Company | ✅ | ❌ | ❌ |
| View All Companies | ✅ | ❌ | ❌ |
| Manage Own Company | ✅ | ✅ | ❌ |
| Create Store | ✅ | ✅ | ❌ |
| Suspend Company | ✅ | ❌ | ❌ |
| Manage Billing | ✅ | ✅ | ❌ |
| View Store Data | ✅ | ✅* | ✅** |

*Company admin can view all stores in their company  
**Store user can only view their assigned store

### Token Types

1. **API Key** (existing): Store-level access for POS sync
2. **JWT User Token** (existing): Store user authentication
3. **JWT Platform Token** (new): Platform admin authentication

## 💰 Subscription Plans

### Default Plans

| Plan | Monthly Cost | Max Stores | Max Users | Support |
|------|-------------|------------|-----------|---------|
| Trial | $0 | 1 | 5 | Email |
| Basic | $49 | 1 | 10 | Email |
| Pro | $149 | 5 | 50 | Priority |
| Enterprise | Custom | Unlimited | Unlimited | Dedicated |

### Trial Period
- 14 days free trial for new companies
- Auto-calculated on registration
- Can be extended by super admin

## 📊 Usage Limits

Companies are restricted based on their subscription plan:

```typescript
// Example: Check if company can add more stores
const canAddStore = async (companyId: string) => {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { _count: { select: { stores: true } } },
  });
  
  if (!company) return false;
  
  return company._count.stores < company.maxStores;
};
```

## 🔄 Backward Compatibility

### Existing Store Routes

All existing routes still work with `storeId`:
```
GET /api/:storeId/products
GET /api/:storeId/users
GET /api/:storeId/sales
```

The system now validates that:
1. Store exists
2. Store belongs to an active company
3. Company subscription is valid

## 🧪 Testing

### Test Company Registration

```bash
curl -X POST http://localhost:5000/api/companies/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "test@example.com",
    "adminFirstName": "Test",
    "adminLastName": "Admin",
    "adminEmail": "admin@test.com",
    "adminPassword": "SecurePass123!",
    "storeName": "Test Store"
  }'
```

### Test Platform Login

```bash
curl -X POST http://localhost:5000/api/platform/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourplatform.com",
    "password": "YourSecurePassword123!"
  }'
```

### Test Company Listing

```bash
curl http://localhost:5000/api/companies \
  -H "Authorization: Bearer YOUR_PLATFORM_JWT_TOKEN"
```

## 📈 Next Steps

### Recommended Enhancements

1. **Payment Integration**
   - Integrate Stripe/PayPal for automated billing
   - Add webhook handlers for subscription events
   - Implement usage-based pricing

2. **Usage Analytics**
   - Track API calls per company
   - Monitor storage usage
   - Alert on limit approaching

3. **White Labeling**
   - Custom domains per company
   - Branded login pages
   - Custom email templates

4. **Advanced Features**
   - Multi-currency support per company
   - Inter-store inventory transfers
   - Company-wide reporting dashboard
   - Franchise management tools

## 🐛 Troubleshooting

### Company Registration Fails

**Error**: "Company email already registered"
- Check if email is unique
- Search existing companies: `GET /api/companies?search=email`

**Error**: "Admin email already registered"
- Admin emails must be globally unique
- User different email for company admin

### Platform Login Issues

**Error**: "Invalid credentials"
- Verify super admin was created correctly
- Check password hashing with bcrypt rounds=12

### Permission Denied

**Error**: "Forbidden: Platform admin access required"
- Ensure JWT token type is `platform_admin`
- Check admin `isActive` status
- Verify role is `super_admin` or `company_admin`

## 📚 Additional Resources

- [API Reference](sync-server/API_REFERENCE.md)
- [Database Schema](sync-server/prisma/schema.prisma)
- [Company Routes](sync-server/src/routes/companies.ts)
- [Authentication Middleware](sync-server/src/middleware/auth.ts)

## 🆘 Support

For issues or questions:
1. Check error logs: `docker-compose logs sync-server`
2. Review audit logs: `GET /api/:storeId/audit-logs`
3. Contact platform support

---

**Status**: ✅ Multi-tenancy implementation complete
**Version**: 2.0.0
**Last Updated**: January 2, 2026
