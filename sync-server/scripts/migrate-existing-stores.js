#!/usr/bin/env node

/**
 * Migration Script: Add Default Company for Existing Stores
 * Run this if you have existing stores in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateExistingStores() {
  console.log('\n========================================');
  console.log('  Existing Stores Migration Script');
  console.log('========================================\n');

  try {
    // Check if there are stores without companyId
    const storesWithoutCompany = await prisma.store.findMany({
      where: {
        companyId: null,
      },
    });

    if (storesWithoutCompany.length === 0) {
      console.log('✅ All stores already have a company assigned\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`Found ${storesWithoutCompany.length} store(s) without company\n`);

    // Create default company
    console.log('⏳ Creating default company...');
    const defaultCompany = await prisma.company.create({
      data: {
        name: 'Default Company',
        slug: 'default-company',
        email: 'admin@defaultcompany.com',
        plan: 'enterprise',
        status: 'active',
        maxStores: 999,
        maxUsers: 999,
      },
    });

    console.log(`✅ Default company created: ${defaultCompany.id}\n`);

    // Update all stores to belong to default company
    console.log('⏳ Assigning stores to default company...');
    const updateResult = await prisma.store.updateMany({
      where: {
        companyId: null,
      },
      data: {
        companyId: defaultCompany.id,
      },
    });

    console.log(`✅ Updated ${updateResult.count} store(s)\n`);

    // Create a default subscription
    console.log('⏳ Creating subscription...');
    const subscription = await prisma.subscription.create({
      data: {
        companyId: defaultCompany.id,
        plan: 'enterprise',
        status: 'active',
        billingCycle: 'monthly',
        amount: 0,
        currency: 'USD',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    console.log(`✅ Subscription created: ${subscription.id}\n`);

    console.log('========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================\n');
    console.log('Summary:');
    console.log(`  Company: ${defaultCompany.name} (${defaultCompany.id})`);
    console.log(`  Stores migrated: ${updateResult.count}`);
    console.log(`  Plan: ${defaultCompany.plan}`);
    console.log('\n💡 Next steps:');
    console.log('  1. Create a platform admin for this company');
    console.log('  2. Or create additional companies via /api/companies/register\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
migrateExistingStores();
