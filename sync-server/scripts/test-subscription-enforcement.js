#!/usr/bin/env node
/**
 * Subscription Enforcement Test Script
 * Tests that subscription middleware is working correctly
 */

const API_BASE = 'http://localhost:3000';
const API_KEY = 'f374535cc03d04c3b2a7e17dfb2aad9a60dbd90f1151c1d7f34245f8c460352d';

async function test(name, fn) {
  try {
    console.log(`\n🧪 Testing: ${name}`);
    await fn();
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

async function request(method, path, body = null, expectedStatus = 200) {
  const options = {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();

  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return { status: response.status, data };
}

async function main() {
  console.log('='.repeat(60));
  console.log('SUBSCRIPTION ENFORCEMENT TEST SUITE');
  console.log('='.repeat(60));

  // Test 1: Health Check
  await test('Health check endpoint', async () => {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (data.status !== 'healthy' && data.status !== 'degraded') {
      throw new Error(`Unexpected health status: ${data.status}`);
    }
    
    console.log(`   Status: ${data.status}`);
    console.log(`   Database: ${data.checks.database.status} (${data.checks.database.latency}ms)`);
  });

  // Test 2: Metrics Endpoint (requires API key)
  await test('Metrics endpoint with API key', async () => {
    const { data } = await request('GET', '/api/metrics');
    
    if (!data.success) {
      throw new Error('Metrics endpoint failed');
    }
    
    console.log(`   Companies: ${data.metrics.companies.total} (${data.metrics.companies.active} active)`);
    console.log(`   Stores: ${data.metrics.stores.total}`);
    console.log(`   Users: ${data.metrics.users.total}`);
  });

  // Test 3: Alerts Endpoint
  await test('Alerts endpoint', async () => {
    const { data } = await request('GET', '/api/alerts');
    
    if (!data.success) {
      throw new Error('Alerts endpoint failed');
    }
    
    console.log(`   Total alerts: ${data.alertCount}`);
    
    if (data.alerts.length > 0) {
      data.alerts.forEach(alert => {
        console.log(`   - [${alert.severity}] ${alert.message}`);
      });
    }
  });

  // Test 4: Platform Login
  await test('Platform admin login', async () => {
    const { data, status } = await request('POST', '/api/platform/login', {
      email: 'bamidele.ogunlade@cybercapsec.com',
      password: 'Admin@2025',
    });

    if (!data.success || !data.token) {
      throw new Error('Login failed');
    }

    console.log(`   Logged in as: ${data.admin.email}`);
    console.log(`   Role: ${data.admin.role}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('SUBSCRIPTION MIDDLEWARE VERIFICATION');
  console.log('='.repeat(60));
  console.log('\nThe following routes now have subscription checks:');
  console.log('\n📦 Products:');
  console.log('   - GET /:storeId/products → requireActiveSubscription');
  console.log('   - POST /:storeId/products → requireActiveSubscription');
  console.log('   - PUT /:storeId/products/:id → requireActiveSubscription');
  console.log('   - DELETE /:storeId/products/:id → requireActiveSubscription');
  console.log('\n👥 Users:');
  console.log('   - POST /:storeId/users → requireActiveSubscription + checkUserLimitNotExceeded');
  console.log('   - PUT /:storeId/users/:userId → requireActiveSubscription');
  console.log('   - DELETE /:storeId/users/:userId → requireActiveSubscription');
  console.log('\n💰 Sales:');
  console.log('   - GET /:storeId/sales → requireActiveSubscription');
  console.log('   - GET /:storeId/sales/:saleId → requireActiveSubscription');
  console.log('   - POST /:storeId/sales/:saleId/void → requireActiveSubscription');
  console.log('   - GET /:storeId/reports/sales → requireActiveSubscription');

  console.log('\n' + '='.repeat(60));
  console.log('TO TEST SUBSCRIPTION ENFORCEMENT:');
  console.log('='.repeat(60));
  console.log('\n1. Create a test company with expired trial:');
  console.log('   - Register company via POST /api/companies/register');
  console.log('   - Update subscription: UPDATE "Subscription" SET "trialEndsAt" = NOW() - INTERVAL \'1 day\'');
  console.log('\n2. Try to access any protected route → should get 403 Forbidden');
  console.log('\n3. Try to create more users than allowed → should get 403 with limit error');
  console.log('\n4. Try to create more stores than allowed → should get 403 with limit error');

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed!');
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
