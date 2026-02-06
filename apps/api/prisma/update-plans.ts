/**
 * Script to update subscription plans to 4 tiers
 * Run with: npx ts-node prisma/update-plans.ts
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📋 Updating subscription plans to 4 tiers...\n');

  // Disable the BASIC plan (we'll keep Starter, Professional, Business, Enterprise)
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'BASIC' },
    data: { isActive: false }
  });
  console.log('❌ Disabled BASIC plan');

  // Update STARTER plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'STARTER' },
    data: {
      displayName: 'Starter',
      description: 'Perfect for small rental businesses just getting started',
      price: 19,
      yearlyPrice: 190,
      currency: 'EUR',
      maxVehicles: 10,
      maxUsers: 2,
      maxLocations: 1,
      features: ['email_support', 'basic_analytics'],
      sortOrder: 1
    }
  });
  console.log('✅ Updated STARTER: €19/mo, 10 vehicles, 2 users');

  // Update PROFESSIONAL plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'PROFESSIONAL' },
    data: {
      displayName: 'Professional',
      description: 'Ideal for growing rental businesses',
      price: 49,
      yearlyPrice: 490,
      currency: 'EUR',
      maxVehicles: 30,
      maxUsers: 5,
      maxLocations: 2,
      features: ['priority_support', 'advanced_analytics', 'email_support'],
      sortOrder: 2
    }
  });
  console.log('✅ Updated PROFESSIONAL: €49/mo, 30 vehicles, 5 users');

  // Update BUSINESS plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'BUSINESS' },
    data: {
      displayName: 'Business',
      description: 'For established rental companies with larger fleets',
      price: 99,
      yearlyPrice: 990,
      currency: 'EUR',
      maxVehicles: 100,
      maxUsers: 15,
      maxLocations: 5,
      features: ['priority_support', 'advanced_analytics', 'api_access', 'all_features'],
      sortOrder: 3
    }
  });
  console.log('✅ Updated BUSINESS: €99/mo, 100 vehicles, 15 users');

  // Update ENTERPRISE plan
  await prisma.subscriptionPlan.updateMany({
    where: { name: 'ENTERPRISE' },
    data: {
      displayName: 'Enterprise',
      description: 'Custom solutions for large-scale operations',
      price: 0,
      yearlyPrice: 0,
      currency: 'EUR',
      maxVehicles: 9999,
      maxUsers: 9999,
      maxLocations: 9999,
      features: ['dedicated_support', 'custom_branding', 'sso', 'white_label', 'api_access', 'all_features'],
      sortOrder: 4
    }
  });
  console.log('✅ Updated ENTERPRISE: Contact us, Unlimited');

  // Update country-specific pricing
  console.log('\n📍 Updating country-specific pricing...');
  
  // Get plan IDs
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true }
  });

  // Delete existing pricing
  await prisma.planPricing.deleteMany();
  
  // Country pricing multipliers (base is EUR)
  const countryPricing = {
    // Balkans - 50% discount
    AL: { currency: 'ALL', rate: 100, discount: 0.5 },
    XK: { currency: 'EUR', rate: 1, discount: 0.4 },
    MK: { currency: 'MKD', rate: 62, discount: 0.5 },
    RS: { currency: 'RSD', rate: 117, discount: 0.5 },
    ME: { currency: 'EUR', rate: 1, discount: 0.35 },
    BA: { currency: 'BAM', rate: 1.96, discount: 0.5 },
    HR: { currency: 'EUR', rate: 1, discount: 0.2 },
    SI: { currency: 'EUR', rate: 1, discount: 0.15 },
    // Western Europe - no discount
    IT: { currency: 'EUR', rate: 1, discount: 0 },
    ES: { currency: 'EUR', rate: 1, discount: 0 },
    FR: { currency: 'EUR', rate: 1, discount: 0 },
    DE: { currency: 'EUR', rate: 1, discount: 0 },
    AT: { currency: 'EUR', rate: 1, discount: 0 },
    NL: { currency: 'EUR', rate: 1, discount: 0 },
    BE: { currency: 'EUR', rate: 1, discount: 0 },
    PT: { currency: 'EUR', rate: 1, discount: 0 },
    // UK
    GB: { currency: 'GBP', rate: 0.85, discount: 0 },
    IE: { currency: 'EUR', rate: 1, discount: 0 },
    // Greece/Cyprus
    GR: { currency: 'EUR', rate: 1, discount: 0.1 },
    CY: { currency: 'EUR', rate: 1, discount: 0.1 },
    // Eastern Europe
    RO: { currency: 'RON', rate: 5, discount: 0.3 },
    BG: { currency: 'BGN', rate: 1.96, discount: 0.3 },
    PL: { currency: 'PLN', rate: 4.3, discount: 0.2 },
    CZ: { currency: 'CZK', rate: 25, discount: 0.15 },
    HU: { currency: 'HUF', rate: 400, discount: 0.25 },
    // Switzerland
    CH: { currency: 'CHF', rate: 0.95, discount: 0 },
  };

  let created = 0;
  for (const plan of plans) {
    if (plan.name === 'ENTERPRISE') continue; // Skip Enterprise (contact us)
    
    for (const [country, config] of Object.entries(countryPricing)) {
      const basePrice = parseFloat(plan.price.toString());
      const baseYearly = parseFloat(plan.yearlyPrice.toString());
      
      const monthlyPrice = Math.round(basePrice * config.rate * (1 - config.discount));
      const yearlyPrice = Math.round(baseYearly * config.rate * (1 - config.discount));
      
      await prisma.planPricing.create({
        data: {
          planId: plan.id,
          country,
          currency: config.currency,
          price: monthlyPrice,
          yearlyPrice: yearlyPrice,
        },
      });
      created++;
    }
  }
  
  console.log(`✅ Created ${created} pricing entries\n`);

  // Show final result
  console.log('📊 Final plan structure:');
  const finalPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });
  
  for (const plan of finalPlans) {
    console.log(`  ${plan.sortOrder}. ${plan.displayName}: €${plan.price}/mo, ${plan.maxVehicles} vehicles, ${plan.maxUsers} users`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
