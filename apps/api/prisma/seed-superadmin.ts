import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

console.log('Connecting to database...');

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || 'admin@drivenow.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
  
  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  
  if (existing) {
    console.log('SuperAdmin already exists:', email);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.superAdmin.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
    },
  });

  console.log('SuperAdmin created successfully:');
  console.log('  Email:', admin.email);
  console.log('  Password:', password);
  console.log('\n⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
}

seedSuperAdmin()
  .catch((e) => {
    console.error('Error seeding SuperAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
