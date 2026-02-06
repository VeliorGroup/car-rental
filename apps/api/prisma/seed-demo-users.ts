import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedDemoUsers() {
  console.log('🔐 Creating demo users with simple credentials...\n');

  const password = 'demo1234';
  // Use 12 rounds to match public-auth service
  const hashedPassword = await bcrypt.hash(password, 12);

  // 1. SUPERADMIN
  console.log('📌 SuperAdmin:');
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'superadmin@carrental.com' },
    update: { password: hashedPassword },
    create: {
      email: 'superadmin@carrental.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
    },
  });
  console.log('   Email:    superadmin@carrental.com');
  console.log('   Password: demo1234');
  console.log('   URL:      /superadmin/login\n');

  // 2. BUSINESS USER (tenant admin)
  // First ensure we have a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Car Rental',
      subdomain: 'demo',
    },
  });

  // Get or create ADMIN role
  const adminRole = await prisma.userRole.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      permissions: ['*'],
      description: 'Administrator with full access',
    },
  });

  console.log('📌 Business User:');
  const businessUser = await prisma.user.upsert({
    where: { email: 'business@carrental.com' },
    update: { password: hashedPassword },
    create: {
      email: 'business@carrental.com',
      password: hashedPassword,
      firstName: 'Business',
      lastName: 'User',
      roleId: adminRole.id,
      tenantId: tenant.id,
    },
  });
  console.log('   Email:    business@carrental.com');
  console.log('   Password: demo1234');
  console.log('   URL:      /business/login\n');

  // 3. CUSTOMER
  console.log('📌 Customer:');
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@carrental.com' },
    update: { passwordHash: hashedPassword },
    create: {
      email: 'customer@carrental.com',
      passwordHash: hashedPassword,
      firstName: 'Customer',
      lastName: 'Demo',
      phone: '+355691234567',
      licenseNumber: 'DEMO-LICENSE-001',
      licenseExpiry: new Date('2030-12-31'),
      tenantId: tenant.id,
      isVerified: true,
    },
  });
  console.log('   Email:    customer@carrental.com');
  console.log('   Password: demo1234');
  console.log('   URL:      /customer/login\n');

  console.log('═══════════════════════════════════════════');
  console.log('✅ Demo users created successfully!');
  console.log('═══════════════════════════════════════════\n');
  console.log('📋 CREDENTIALS SUMMARY:');
  console.log('───────────────────────────────────────────');
  console.log('│ Type       │ Email                      │ Password │');
  console.log('───────────────────────────────────────────');
  console.log('│ SuperAdmin │ superadmin@carrental.com  │ demo1234 │');
  console.log('│ Business   │ business@carrental.com    │ demo1234 │');
  console.log('│ Customer   │ customer@carrental.com    │ demo1234 │');
  console.log('───────────────────────────────────────────\n');
}

seedDemoUsers()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
