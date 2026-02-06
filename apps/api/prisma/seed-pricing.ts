import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Country-specific pricing for subscription plans
 * Prices adjusted for local markets and purchasing power
 */

// Price for ALL countries
// Europe uses EUR (same base price, no discount)
// Balkans get local currency with discount
const COUNTRY_PRICING: Record<string, { currency: string; rate: number; discount: number }> = {
  // Balkans with local currencies
  AL: { currency: 'ALL', rate: 100, discount: 0.5 },   // Albania: 50% discount
  MK: { currency: 'MKD', rate: 62, discount: 0.5 },    // Macedonia: 50% discount
  RS: { currency: 'RSD', rate: 117, discount: 0.5 },   // Serbia: 50% discount
  BA: { currency: 'BAM', rate: 1.96, discount: 0.5 },  // Bosnia: 50% discount
  
  // Balkans using EUR
  XK: { currency: 'EUR', rate: 1, discount: 0.4 },     // Kosovo: 40% discount
  ME: { currency: 'EUR', rate: 1, discount: 0.35 },    // Montenegro: 35% discount
  HR: { currency: 'EUR', rate: 1, discount: 0.2 },     // Croatia: 20% discount
  SI: { currency: 'EUR', rate: 1, discount: 0.1 },     // Slovenia: 10% discount
  
  // Western Europe EUR - no discount
  IT: { currency: 'EUR', rate: 1, discount: 0 },
  DE: { currency: 'EUR', rate: 1, discount: 0 },
  FR: { currency: 'EUR', rate: 1, discount: 0 },
  ES: { currency: 'EUR', rate: 1, discount: 0 },
  AT: { currency: 'EUR', rate: 1, discount: 0 },
  NL: { currency: 'EUR', rate: 1, discount: 0 },
  BE: { currency: 'EUR', rate: 1, discount: 0 },
  PT: { currency: 'EUR', rate: 1, discount: 0 },
  GR: { currency: 'EUR', rate: 1, discount: 0.1 },     // Greece: 10% discount
  SK: { currency: 'EUR', rate: 1, discount: 0.1 },     // Slovakia: 10% discount
  
  // Non-EUR European countries
  CH: { currency: 'CHF', rate: 0.95, discount: 0 },    // Switzerland
  GB: { currency: 'GBP', rate: 0.85, discount: 0 },    // UK
  PL: { currency: 'PLN', rate: 4.3, discount: 0.2 },   // Poland: 20% discount
  RO: { currency: 'RON', rate: 5, discount: 0.3 },     // Romania: 30% discount
  BG: { currency: 'BGN', rate: 1.96, discount: 0.3 },  // Bulgaria: 30% discount
  CZ: { currency: 'CZK', rate: 25, discount: 0.15 },   // Czech: 15% discount
  HU: { currency: 'HUF', rate: 400, discount: 0.25 },  // Hungary: 25% discount
};


// NO conversion rates needed separately - they're in the pricing above

// Base prices in EUR (must match plan names in DB)
const BASE_PRICES_EUR: Record<string, { monthly: number; yearly: number }> = {
  starter: { monthly: 19, yearly: 190 },
  basic: { monthly: 29, yearly: 290 },
  professional: { monthly: 49, yearly: 490 },
  business: { monthly: 99, yearly: 990 },
  enterprise: { monthly: 0, yearly: 0 },
};

async function main() {
  console.log('💰 Seeding country-specific pricing...');

  // Get all plans
  const plans = await prisma.subscriptionPlan.findMany();
  
  if (plans.length === 0) {
    console.log('No subscription plans found. Run main seed first.');
    return;
  }

  // Delete existing pricing
  await prisma.planPricing.deleteMany();
  console.log('🗑️ Cleared existing pricing');

  let created = 0;

  for (const plan of plans) {
    const planKey = plan.name.toLowerCase() as keyof typeof BASE_PRICES_EUR;
    const basePrices = BASE_PRICES_EUR[planKey] || BASE_PRICES_EUR.basic;

    for (const [country, config] of Object.entries(COUNTRY_PRICING)) {
      // Calculate local price: base * (1 - discount) * currency_rate
      let monthlyPrice = Math.round(basePrices.monthly * (1 - config.discount) * config.rate);
      let yearlyPrice = Math.round(basePrices.yearly * (1 - config.discount) * config.rate);

      // Round to nice numbers based on currency rate
      if (config.rate > 10) {
        // For currencies with high rates (ALL, RSD, HUF, etc.), round to nearest 100
        monthlyPrice = Math.round(monthlyPrice / 100) * 100;
        yearlyPrice = Math.round(yearlyPrice / 100) * 100;
      } else if (config.rate > 1) {
        // For currencies like PLN, RON, round to nearest 5
        monthlyPrice = Math.round(monthlyPrice / 5) * 5;
        yearlyPrice = Math.round(yearlyPrice / 5) * 5;
      }

      // Ensure minimum price
      monthlyPrice = Math.max(monthlyPrice, basePrices.monthly === 0 ? 0 : 1);
      yearlyPrice = Math.max(yearlyPrice, basePrices.yearly === 0 ? 0 : 10);

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

  console.log(`✅ Created ${created} pricing entries for ${Object.keys(COUNTRY_PRICING).length} countries`);
  console.log('');
  
  // Show sample prices
  console.log('📊 Sample pricing for "Basic" plan:');
  const samplePricing = await prisma.planPricing.findMany({
    where: { plan: { name: 'basic' } },
    include: { plan: true },
    take: 10,
  });
  
  for (const p of samplePricing) {
    console.log(`   ${p.country}: ${p.currency} ${p.price}/month, ${p.yearlyPrice}/year`);
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
