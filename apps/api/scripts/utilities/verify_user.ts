
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });
    console.log('User found:', user);
    
    // Check Tenant
    const tenant = await prisma.tenant.findUnique({
        where: { subdomain: 'demo' }
    });
    console.log('Tenant found:', tenant);

  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
