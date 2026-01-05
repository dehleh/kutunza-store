# Testing Guide for Kutunza POS

## 📋 Test Coverage

### Backend API Tests (sync-server)
- Unit tests for services and utilities
- Integration tests for API endpoints
- Database transaction tests
- WebSocket connection tests

### Frontend Tests (pos-web-app, customer-display)
- Component unit tests
- Integration tests for stores
- E2E tests for critical workflows

## 🧪 Backend Testing

### Setup

```bash
cd sync-server

# Install test dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Create jest.config.js
```

### jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

### Test Setup (tests/setup.ts)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  const tables = ['Sale', 'Product', 'User', 'Category', 'Customer', 'AuditLog'];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
});

global.prisma = prisma;
```

### Example Unit Tests (tests/services/auditLogger.test.ts)

```typescript
import { AuditLogger } from '../../src/services/auditLogger';
import { prisma } from '../../src/config/database';

describe('AuditLogger', () => {
  const testStoreId = 'test-store-1';
  const testUserId = 'test-user-1';

  describe('log', () => {
    it('should create audit log entry', async () => {
      await AuditLogger.log({
        storeId: testStoreId,
        userId: testUserId,
        action: 'CREATE',
        entityType: 'Product',
        entityId: 'product-1',
      });

      const logs = await prisma.auditLog.findMany({
        where: { storeId: testStoreId },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[0].entityType).toBe('Product');
    });

    it('should handle errors gracefully', async () => {
      // Should not throw even if database fails
      await expect(
        AuditLogger.log({
          storeId: '',
          userId: '',
          action: 'TEST',
          entityType: 'Test',
          entityId: 'test',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      // Create test audit logs
      await Promise.all([
        AuditLogger.log({
          storeId: testStoreId,
          userId: testUserId,
          action: 'CREATE',
          entityType: 'Product',
          entityId: 'product-1',
        }),
        AuditLogger.log({
          storeId: testStoreId,
          userId: testUserId,
          action: 'UPDATE',
          entityType: 'Product',
          entityId: 'product-1',
        }),
      ]);
    });

    it('should query audit logs with filters', async () => {
      const result = await AuditLogger.query({
        storeId: testStoreId,
        action: 'CREATE',
      });

      expect(result.logs).toHaveLength(1);
      expect(result.logs[0].action).toBe('CREATE');
    });
  });
});
```

### Example API Integration Tests (tests/routes/products.test.ts)

```typescript
import request from 'supertest';
import { app } from '../../src/index'; // Export app from index.ts
import { prisma } from '../../src/config/database';

describe('Products API', () => {
  const storeId = 'test-store-1';
  const apiKey = process.env.API_KEY || 'test-api-key';

  beforeEach(async () => {
    // Create test store
    await prisma.store.create({
      data: {
        id: storeId,
        name: 'Test Store',
      },
    });

    // Create test category
    await prisma.category.create({
      data: {
        id: 'cat-1',
        storeId,
        name: 'Test Category',
      },
    });
  });

  describe('GET /:storeId/products', () => {
    it('should return products for store', async () => {
      // Create test product
      await prisma.product.create({
        data: {
          id: 'prod-1',
          storeId,
          sku: 'TEST001',
          name: 'Test Product',
          categoryId: 'cat-1',
          costPrice: 10,
          sellingPrice: 20,
        },
      });

      const response = await request(app)
        .get(`/api/${storeId}/products`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Product');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/${storeId}/products`)
        .expect(401);
    });
  });

  describe('POST /:storeId/products', () => {
    it('should create new product', async () => {
      const productData = {
        sku: 'NEW001',
        name: 'New Product',
        categoryId: 'cat-1',
        costPrice: 15,
        sellingPrice: 25,
      };

      const response = await request(app)
        .post(`/api/${storeId}/products`)
        .set('X-API-Key', apiKey)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('New Product');

      // Verify in database
      const product = await prisma.product.findFirst({
        where: { sku: 'NEW001' },
      });
      expect(product).not.toBeNull();
    });

    it('should validate required fields', async () => {
      await request(app)
        .post(`/api/${storeId}/products`)
        .set('X-API-Key', apiKey)
        .send({ name: 'Invalid' })
        .expect(400);
    });
  });
});
```

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific test file
npm test -- products.test.ts
```

## 🎭 Frontend Testing

### Setup

```bash
cd pos-web-app

# Install test dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Test Setup (src/tests/setup.ts)

```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});
```

### Component Tests (src/components/__tests__/Button.test.tsx)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
  });
});
```

### Store Tests (src/store/__tests__/cartStore.test.ts)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../cartStore';

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('adds items to cart', () => {
    const { addItem, items } = useCartStore.getState();
    
    addItem({
      id: '1',
      name: 'Test Product',
      price: 10,
      quantity: 1,
    });

    expect(items()).toHaveLength(1);
    expect(items()[0].name).toBe('Test Product');
  });

  it('calculates total correctly', () => {
    const { addItem, calculate } = useCartStore.getState();
    
    addItem({ id: '1', name: 'Product 1', price: 10, quantity: 2 });
    addItem({ id: '2', name: 'Product 2', price: 15, quantity: 1 });

    const totals = calculate();
    expect(totals.subtotal).toBe(35);
  });
});
```

### E2E Tests with Playwright

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Example (e2e/pos-workflow.spec.ts)

```typescript
import { test, expect } from '@playwright/test';

test.describe('POS Workflow', () => {
  test('complete sale transaction', async ({ page }) => {
    await page.goto('/');

    // Login
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/pos');

    // Add product to cart
    await page.click('[data-testid="product-1"]');
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();

    // Complete transaction
    await page.click('[data-testid="checkout-button"]');
    await page.click('[data-testid="payment-cash"]');
    await page.fill('[data-testid="amount-received"]', '100');
    await page.click('[data-testid="complete-sale"]');

    // Verify success
    await expect(page.locator('[data-testid="receipt"]')).toBeVisible();
  });
});
```

### Run Frontend Tests

```bash
# Unit tests
npm test

# E2E tests
npx playwright test

# E2E with UI
npx playwright test --ui
```

## 📊 Test Coverage Reports

```bash
# Backend coverage
cd sync-server
npm run test:coverage
open coverage/lcov-report/index.html

# Frontend coverage
cd pos-web-app
npm run test:coverage
open coverage/index.html
```

## 🔄 CI Integration

Tests run automatically on every push via GitHub Actions (see .github/workflows/ci-cd.yml).

## 📝 Testing Best Practices

1. **Write tests first** (TDD) for new features
2. **Test behavior, not implementation**
3. **Keep tests simple and focused**
4. **Use descriptive test names**
5. **Mock external dependencies**
6. **Aim for >70% coverage**
7. **Test edge cases and error conditions**
8. **Run tests before committing**

## 🎯 Critical Test Scenarios

- [ ] User authentication and authorization
- [ ] Product CRUD operations
- [ ] Cart management and calculations
- [ ] Payment processing
- [ ] Inventory adjustments
- [ ] Sale voiding with inventory restoration
- [ ] Audit log creation
- [ ] WebSocket real-time updates
- [ ] Offline mode and sync
- [ ] Rate limiting
- [ ] Error handling
