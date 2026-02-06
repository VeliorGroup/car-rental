import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Load env file
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo Car Rental',
      subdomain: 'demo',
    },
  });

  // Create All Roles with specific permissions
  const roles = [
    {
      name: 'ADMIN',
      permissions: ['*'],
      description: 'Administrator with full access to all features',
    },
    {
      name: 'MANAGER',
      permissions: [
        'vehicles:read', 'vehicles:write',
        'bookings:read', 'bookings:write',
        'customers:read', 'customers:write',
        'analytics:read',
        'branches:read', 'branches:write',
        'maintenance:read', 'maintenance:write',
        'cautions:read', 'cautions:write',
        'damages:read', 'damages:write',
      ],
      description: 'Manager with access to operations but not user management',
    },
    {
      name: 'OPERATOR',
      permissions: [
        'bookings:read', 'bookings:write',
        'customers:read', 'customers:write',
        'vehicles:read',
        'cautions:read', 'cautions:write',
      ],
      description: 'Operator for daily booking and customer operations',
    },
    {
      name: 'MECHANIC',
      permissions: [
        'maintenance:read', 'maintenance:write',
        'vehicles:read',
        'tires:read', 'tires:write',
      ],
      description: 'Mechanic for vehicle maintenance tasks',
    },
    {
      name: 'STAFF',
      permissions: [
        'vehicles:read',
        'bookings:read',
        'customers:read',
        'analytics:read',
        'branches:read',
      ],
      description: 'Staff with read-only access',
    },
  ];

  const createdRoles: { [key: string]: any } = {};
  for (const role of roles) {
    createdRoles[role.name] = await prisma.userRole.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions, description: role.description },
      create: role,
    });
  }

  // Create Subscription Plans - 4 tiers with country-specific pricing
  // Pricing strategy: 
  // - Balkans (AL, XK, MK, RS, etc.): ~40-50% cheaper
  // - Southern EU (IT, ES, PT, GR): standard pricing
  // - Northern EU (FR, DE, AT, NL): ~10% higher
  // - UK: converted to GBP
  const plans = [
    { 
      name: 'STARTER', 
      displayName: 'Starter', 
      price: 19, 
      yearlyPrice: 190, 
      maxVehicles: 10, 
      maxUsers: 2, 
      maxLocations: 1,
      features: ['email_support', 'basic_analytics'],
      sortOrder: 1,
      pricing: [
        // Balkans - 50% discount
        { country: 'AL', price: 10, yearlyPrice: 100, currency: 'EUR' },
        { country: 'XK', price: 10, yearlyPrice: 100, currency: 'EUR' },
        { country: 'MK', price: 10, yearlyPrice: 100, currency: 'EUR' },
        { country: 'RS', price: 10, yearlyPrice: 100, currency: 'EUR' },
        { country: 'ME', price: 12, yearlyPrice: 120, currency: 'EUR' },
        { country: 'BA', price: 10, yearlyPrice: 100, currency: 'EUR' },
        { country: 'HR', price: 15, yearlyPrice: 150, currency: 'EUR' },
        { country: 'SI', price: 16, yearlyPrice: 160, currency: 'EUR' },
        // Southern EU - standard
        { country: 'IT', price: 19, yearlyPrice: 190, currency: 'EUR' },
        { country: 'ES', price: 19, yearlyPrice: 190, currency: 'EUR' },
        { country: 'PT', price: 19, yearlyPrice: 190, currency: 'EUR' },
        { country: 'GR', price: 17, yearlyPrice: 170, currency: 'EUR' },
        { country: 'CY', price: 17, yearlyPrice: 170, currency: 'EUR' },
        // Northern EU - 10% higher
        { country: 'FR', price: 21, yearlyPrice: 210, currency: 'EUR' },
        { country: 'DE', price: 21, yearlyPrice: 210, currency: 'EUR' },
        { country: 'AT', price: 21, yearlyPrice: 210, currency: 'EUR' },
        { country: 'NL', price: 21, yearlyPrice: 210, currency: 'EUR' },
        { country: 'BE', price: 21, yearlyPrice: 210, currency: 'EUR' },
        { country: 'CH', price: 22, yearlyPrice: 220, currency: 'CHF' },
        { country: 'IE', price: 19, yearlyPrice: 190, currency: 'EUR' },
        // UK
        { country: 'GB', price: 16, yearlyPrice: 160, currency: 'GBP' },
        // Eastern EU
        { country: 'RO', price: 13, yearlyPrice: 130, currency: 'EUR' },
        { country: 'BG', price: 13, yearlyPrice: 130, currency: 'EUR' },
        { country: 'PL', price: 15, yearlyPrice: 150, currency: 'EUR' },
        { country: 'CZ', price: 16, yearlyPrice: 160, currency: 'EUR' },
        { country: 'HU', price: 14, yearlyPrice: 140, currency: 'EUR' },
      ]
    },
    { 
      name: 'PROFESSIONAL', 
      displayName: 'Professional', 
      price: 49, 
      yearlyPrice: 490, 
      maxVehicles: 30, 
      maxUsers: 5, 
      maxLocations: 2,
      features: ['email_support', 'advanced_analytics', 'priority_support'],
      sortOrder: 2,
      pricing: [
        // Balkans - 50% discount
        { country: 'AL', price: 25, yearlyPrice: 250, currency: 'EUR' },
        { country: 'XK', price: 25, yearlyPrice: 250, currency: 'EUR' },
        { country: 'MK', price: 25, yearlyPrice: 250, currency: 'EUR' },
        { country: 'RS', price: 25, yearlyPrice: 250, currency: 'EUR' },
        { country: 'ME', price: 30, yearlyPrice: 300, currency: 'EUR' },
        { country: 'BA', price: 25, yearlyPrice: 250, currency: 'EUR' },
        { country: 'HR', price: 39, yearlyPrice: 390, currency: 'EUR' },
        { country: 'SI', price: 42, yearlyPrice: 420, currency: 'EUR' },
        // Southern EU
        { country: 'IT', price: 49, yearlyPrice: 490, currency: 'EUR' },
        { country: 'ES', price: 49, yearlyPrice: 490, currency: 'EUR' },
        { country: 'PT', price: 49, yearlyPrice: 490, currency: 'EUR' },
        { country: 'GR', price: 44, yearlyPrice: 440, currency: 'EUR' },
        { country: 'CY', price: 44, yearlyPrice: 440, currency: 'EUR' },
        // Northern EU
        { country: 'FR', price: 55, yearlyPrice: 550, currency: 'EUR' },
        { country: 'DE', price: 55, yearlyPrice: 550, currency: 'EUR' },
        { country: 'AT', price: 55, yearlyPrice: 550, currency: 'EUR' },
        { country: 'NL', price: 55, yearlyPrice: 550, currency: 'EUR' },
        { country: 'BE', price: 55, yearlyPrice: 550, currency: 'EUR' },
        { country: 'CH', price: 58, yearlyPrice: 580, currency: 'CHF' },
        { country: 'IE', price: 49, yearlyPrice: 490, currency: 'EUR' },
        // UK
        { country: 'GB', price: 42, yearlyPrice: 420, currency: 'GBP' },
        // Eastern EU
        { country: 'RO', price: 35, yearlyPrice: 350, currency: 'EUR' },
        { country: 'BG', price: 35, yearlyPrice: 350, currency: 'EUR' },
        { country: 'PL', price: 39, yearlyPrice: 390, currency: 'EUR' },
        { country: 'CZ', price: 42, yearlyPrice: 420, currency: 'EUR' },
        { country: 'HU', price: 37, yearlyPrice: 370, currency: 'EUR' },
      ]
    },
    { 
      name: 'BUSINESS', 
      displayName: 'Business', 
      price: 99, 
      yearlyPrice: 990, 
      maxVehicles: 100, 
      maxUsers: 15, 
      maxLocations: 5,
      features: ['priority_support', 'advanced_analytics', 'api_access', 'all_features'],
      sortOrder: 3,
      pricing: [
        // Balkans
        { country: 'AL', price: 50, yearlyPrice: 500, currency: 'EUR' },
        { country: 'XK', price: 50, yearlyPrice: 500, currency: 'EUR' },
        { country: 'MK', price: 50, yearlyPrice: 500, currency: 'EUR' },
        { country: 'RS', price: 50, yearlyPrice: 500, currency: 'EUR' },
        { country: 'ME', price: 60, yearlyPrice: 600, currency: 'EUR' },
        { country: 'BA', price: 50, yearlyPrice: 500, currency: 'EUR' },
        { country: 'HR', price: 79, yearlyPrice: 790, currency: 'EUR' },
        { country: 'SI', price: 85, yearlyPrice: 850, currency: 'EUR' },
        // Southern EU
        { country: 'IT', price: 99, yearlyPrice: 990, currency: 'EUR' },
        { country: 'ES', price: 99, yearlyPrice: 990, currency: 'EUR' },
        { country: 'PT', price: 99, yearlyPrice: 990, currency: 'EUR' },
        { country: 'GR', price: 89, yearlyPrice: 890, currency: 'EUR' },
        { country: 'CY', price: 89, yearlyPrice: 890, currency: 'EUR' },
        // Northern EU
        { country: 'FR', price: 109, yearlyPrice: 1090, currency: 'EUR' },
        { country: 'DE', price: 109, yearlyPrice: 1090, currency: 'EUR' },
        { country: 'AT', price: 109, yearlyPrice: 1090, currency: 'EUR' },
        { country: 'NL', price: 109, yearlyPrice: 1090, currency: 'EUR' },
        { country: 'BE', price: 109, yearlyPrice: 1090, currency: 'EUR' },
        { country: 'CH', price: 115, yearlyPrice: 1150, currency: 'CHF' },
        { country: 'IE', price: 99, yearlyPrice: 990, currency: 'EUR' },
        // UK
        { country: 'GB', price: 85, yearlyPrice: 850, currency: 'GBP' },
        // Eastern EU
        { country: 'RO', price: 70, yearlyPrice: 700, currency: 'EUR' },
        { country: 'BG', price: 70, yearlyPrice: 700, currency: 'EUR' },
        { country: 'PL', price: 79, yearlyPrice: 790, currency: 'EUR' },
        { country: 'CZ', price: 85, yearlyPrice: 850, currency: 'EUR' },
        { country: 'HU', price: 75, yearlyPrice: 750, currency: 'EUR' },
      ]
    },
    { 
      name: 'ENTERPRISE', 
      displayName: 'Enterprise', 
      price: 0, // Contact us
      yearlyPrice: 0,
      maxVehicles: 999999, // Unlimited
      maxUsers: 999999, // Unlimited
      maxLocations: 999999, // Unlimited
      features: ['dedicated_support', 'all_features', 'api_access', 'custom_branding', 'sso', 'white_label'],
      sortOrder: 4,
      pricing: [] // No fixed pricing - contact sales
    },
  ];

  // cleanup old plans
  const activePlanNames = plans.map(p => p.name);
  await prisma.subscriptionPlan.deleteMany({
    where: {
      name: { notIn: activePlanNames }
    }
  });

  for (const plan of plans) {
    const { pricing, features, ...planData } = plan;
    
    // Create/Update main plan
    const savedPlan = await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        ...planData
      },
      create: {
        ...planData
      }
    });

    // Handle Country Pricing
    if (pricing && pricing.length > 0) {
      // Clean old pricing for this plan to avoid duplicates on re-seed
      await prisma.planPricing.deleteMany({
        where: { planId: savedPlan.id }
      });

      // Create new pricing
      for (const p of pricing) {
        await prisma.planPricing.create({
          data: {
            planId: savedPlan.id,
            country: p.country,
            price: p.price,
            yearlyPrice: p.yearlyPrice,
            currency: p.currency || 'EUR'
          }
        });
      }
    }
  }

  console.log({ tenant });

  // Create Vehicle Pricing
  const categories = [
    { category: 'ECONOMY', dailyPrice: 50 },
    { category: 'COMPACT', dailyPrice: 60 },
    { category: 'MIDSIZE', dailyPrice: 70 },
    { category: 'FULLSIZE', dailyPrice: 90 },
    { category: 'SUV', dailyPrice: 100 },
    { category: 'LUXURY', dailyPrice: 150 },
    { category: 'VAN', dailyPrice: 120 },
  ];

  for (const p of categories) {
    const existing = await prisma.vehiclePricing.findFirst({
      where: {
        tenantId: tenant.id,
        category: p.category as any, // Cast to any to avoid Enum import issues if not available in context
        season: 'LOW',
      },
    });

    if (!existing) {
      await prisma.vehiclePricing.create({
        data: {
          tenantId: tenant.id,
          category: p.category as any,
          season: 'LOW',
          dailyPrice: p.dailyPrice,
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2030-12-31'),
        },
      });
      console.log(`Created pricing for ${p.category}`);
    }
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