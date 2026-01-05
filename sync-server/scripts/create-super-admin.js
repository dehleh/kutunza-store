#!/usr/bin/env node

/**
 * Multi-Tenancy Setup Script
 * Creates initial super admin for the platform
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function createSuperAdmin() {
  console.log('\n=================================');
  console.log('  Super Admin Creation Wizard');
  console.log('=================================\n');

  try {
    // Get user input
    const email = await question('Email address: ');
    const password = await question('Password (min 8 characters): ');
    const firstName = await question('First name: ');
    const lastName = await question('Last name: ');

    // Validate
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!firstName || !lastName) {
      throw new Error('First name and last name are required');
    }

    // Check if email exists
    const existing = await prisma.platformAdmin.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('\n❌ Error: Email already exists\n');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    // Hash password
    console.log('\n⏳ Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create super admin
    console.log('⏳ Creating super admin...');
    const admin = await prisma.platformAdmin.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'super_admin',
        canManageCompanies: true,
        canManageBilling: true,
        canViewAllStores: true,
      },
    });

    console.log('\n✅ Super admin created successfully!\n');
    console.log('Details:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.firstName} ${admin.lastName}`);
    console.log(`  Role: ${admin.role}`);
    console.log('\n📝 You can now login at: POST /api/platform/login\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run
createSuperAdmin();
