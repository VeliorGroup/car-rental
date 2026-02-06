
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst();
  const vehicle = await prisma.vehicle.findFirst({ where: { status: 'AVAILABLE' } });
  
  console.log('Customer ID:', customer?.id);
  console.log('Vehicle ID:', vehicle?.id);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
