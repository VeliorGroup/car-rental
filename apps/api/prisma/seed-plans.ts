import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'For small fleets just getting started.',
      price: 10.00,
      maxVehicles: 10,
      maxUsers: 3,
      maxLocations: 1,
      features: ['basic_analytics', 'email_support'],
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'starter',
      displayName: 'Starter',
      description: 'Perfect for small rental companies.',
      price: 25.00,
      maxVehicles: 25,
      maxUsers: 5,
      maxLocations: 2,
      features: ['basic_analytics', 'email_support'],
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'professional',
      displayName: 'Professional',
      description: 'For growing businesses needing more capacity.',
      price: 50.00,
      maxVehicles: 50,
      maxUsers: 15,
      maxLocations: 3,
      features: ['advanced_analytics', 'priority_support', 'api_access'],
      sortOrder: 3,
      isActive: true,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For large fleets. Contact us for custom pricing.',
      price: 0.00,
      maxVehicles: 9999,
      maxUsers: 9999,
      maxLocations: 9999,
      features: ['all_features', 'dedicated_support', 'custom_branding', 'sso', 'white_label'],
      sortOrder: 4,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`Plan ${created.displayName} created/updated.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
