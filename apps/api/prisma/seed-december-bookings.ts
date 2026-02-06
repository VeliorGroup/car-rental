import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📅 Adding December 2025 booking records...');
  
  // Get existing tenant - only select id to avoid schema mismatch
  const tenant = await prisma.tenant.findUnique({ 
    where: { subdomain: 'demo' },
    select: { id: true }
  });
  if (!tenant) {
    console.log('❌ No tenant found, run seed.ts first');
    return;
  }

  // Get admin user for createdBy references
  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!admin) {
    console.log('❌ No admin user found');
    return;
  }

  // Get existing customers
  const customers = await prisma.customer.findMany({ where: { tenantId: tenant.id } });
  if (customers.length === 0) {
    console.log('❌ No customers found, run reset-and-seed.ts first');
    return;
  }

  // Get existing vehicles
  const vehicles = await prisma.vehicle.findMany({ 
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' }
  });
  if (vehicles.length === 0) {
    console.log('❌ No vehicles found, run reset-and-seed.ts first');
    return;
  }

  // Get existing branches
  const branches = await prisma.branch.findMany({ where: { tenantId: tenant.id } });
  
  console.log(`Found ${customers.length} customers, ${vehicles.length} vehicles, ${branches.length} branches`);

  // Define booking data for December 2025
  const decemberBookings = [
    // First week (1-7 December) - Bookings completate
    { startDay: 1, duration: 3, customerIdx: 0, vehicleIdx: 0, status: 'CHECKED_IN' },
    { startDay: 2, duration: 2, customerIdx: 1, vehicleIdx: 1, status: 'CHECKED_IN' },
    { startDay: 3, duration: 4, customerIdx: 2, vehicleIdx: 2, status: 'CHECKED_IN' },
    { startDay: 4, duration: 5, customerIdx: 3, vehicleIdx: 3, status: 'CHECKED_IN' },
    { startDay: 5, duration: 2, customerIdx: 4, vehicleIdx: 4, status: 'CHECKED_IN' },
    { startDay: 6, duration: 3, customerIdx: 5, vehicleIdx: 5, status: 'CHECKED_IN' },
    { startDay: 7, duration: 4, customerIdx: 6, vehicleIdx: 6, status: 'CHECKED_IN' },

    // Second week (8-14 December) - Mix di stati
    { startDay: 8, duration: 5, customerIdx: 7, vehicleIdx: 7, status: 'CHECKED_IN' },
    { startDay: 9, duration: 3, customerIdx: 0, vehicleIdx: 8, status: 'CHECKED_IN' },
    { startDay: 10, duration: 4, customerIdx: 1, vehicleIdx: 9, status: 'CHECKED_IN' },
    { startDay: 11, duration: 2, customerIdx: 2, vehicleIdx: 0, status: 'CHECKED_IN' },
    { startDay: 12, duration: 6, customerIdx: 3, vehicleIdx: 1, status: 'CHECKED_IN' },
    { startDay: 13, duration: 3, customerIdx: 4, vehicleIdx: 2, status: 'CHECKED_OUT' },
    { startDay: 14, duration: 4, customerIdx: 5, vehicleIdx: 3, status: 'CHECKED_OUT' },

    // Third week (15-21 December) - Corrente
    { startDay: 15, duration: 3, customerIdx: 6, vehicleIdx: 4, status: 'CHECKED_OUT' },
    { startDay: 15, duration: 5, customerIdx: 7, vehicleIdx: 5, status: 'CHECKED_OUT' },
    { startDay: 16, duration: 2, customerIdx: 0, vehicleIdx: 6, status: 'CONFIRMED' },
    { startDay: 17, duration: 4, customerIdx: 1, vehicleIdx: 7, status: 'CONFIRMED' },
    { startDay: 18, duration: 3, customerIdx: 2, vehicleIdx: 8, status: 'CONFIRMED' },
    { startDay: 19, duration: 5, customerIdx: 3, vehicleIdx: 9, status: 'CONFIRMED' },
    { startDay: 20, duration: 2, customerIdx: 4, vehicleIdx: 0, status: 'CONFIRMED' },
    { startDay: 21, duration: 4, customerIdx: 5, vehicleIdx: 1, status: 'CONFIRMED' },

    // Fourth week (22-28 December) - Periodo natalizio
    { startDay: 22, duration: 7, customerIdx: 6, vehicleIdx: 2, status: 'CONFIRMED' },
    { startDay: 23, duration: 5, customerIdx: 7, vehicleIdx: 3, status: 'CONFIRMED' },
    { startDay: 24, duration: 4, customerIdx: 0, vehicleIdx: 4, status: 'CONFIRMED' },
    { startDay: 25, duration: 3, customerIdx: 1, vehicleIdx: 5, status: 'CONFIRMED' },
    { startDay: 26, duration: 6, customerIdx: 2, vehicleIdx: 6, status: 'CONFIRMED' },
    { startDay: 27, duration: 4, customerIdx: 3, vehicleIdx: 7, status: 'CONFIRMED' },
    { startDay: 28, duration: 5, customerIdx: 4, vehicleIdx: 8, status: 'CONFIRMED' },

    // Last days (29-31 December) - Fine anno
    { startDay: 29, duration: 3, customerIdx: 5, vehicleIdx: 9, status: 'CONFIRMED' },
    { startDay: 30, duration: 4, customerIdx: 6, vehicleIdx: 0, status: 'CONFIRMED' },
    { startDay: 31, duration: 2, customerIdx: 7, vehicleIdx: 1, status: 'CONFIRMED' },

    // Additional bookings for variety
    { startDay: 2, duration: 7, customerIdx: 0, vehicleIdx: 9, status: 'CHECKED_IN' },
    { startDay: 5, duration: 4, customerIdx: 1, vehicleIdx: 8, status: 'CHECKED_IN' },
    { startDay: 8, duration: 3, customerIdx: 2, vehicleIdx: 7, status: 'CHECKED_IN' },
    { startDay: 10, duration: 5, customerIdx: 3, vehicleIdx: 6, status: 'CHECKED_IN' },
    { startDay: 16, duration: 6, customerIdx: 4, vehicleIdx: 5, status: 'CONFIRMED' },
    
    // Some cancelled bookings
    { startDay: 3, duration: 3, customerIdx: 5, vehicleIdx: 4, status: 'CANCELLED' },
    { startDay: 12, duration: 2, customerIdx: 6, vehicleIdx: 3, status: 'CANCELLED' },
    { startDay: 20, duration: 4, customerIdx: 7, vehicleIdx: 2, status: 'CANCELLED' },
  ];

  // Daily prices based on vehicle category
  const categoryPrices: Record<string, number> = {
    'ECONOMY': 50,
    'COMPACT': 60,
    'MIDSIZE': 70,
    'FULLSIZE': 90,
    'SUV': 100,
    'LUXURY': 150,
    'VAN': 120,
  };

  let createdCount = 0;
  
  for (const booking of decemberBookings) {
    const vehicle = vehicles[booking.vehicleIdx % vehicles.length];
    const customer = customers[booking.customerIdx % customers.length];
    
    const startDate = new Date(2025, 11, booking.startDay, 9, 0, 0); // December 2025
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + booking.duration);

    const dailyPrice = categoryPrices[vehicle.category] || 70;
    const totalAmount = dailyPrice * booking.duration;

    const pickupBranch = branches.length > 0 ? branches[createdCount % branches.length] : null;
    const dropoffBranch = branches.length > 0 ? branches[(createdCount + 1) % branches.length] : null;

    try {
      await prisma.booking.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          ...(pickupBranch && { pickupBranchId: pickupBranch.id }),
          ...(dropoffBranch && { dropoffBranchId: dropoffBranch.id }),
          startDate,
          endDate,
          status: booking.status as any,
          basePrice: dailyPrice,
          dailyPrice,
          totalAmount,
          discountAmount: Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0,
          extras: [],
          cautionAmount: 300,
          createdById: admin.id,
          kmOut: booking.status === 'CHECKED_OUT' || booking.status === 'CHECKED_IN' ? vehicle.currentKm : null,
          kmIn: booking.status === 'CHECKED_IN' ? vehicle.currentKm + Math.floor(Math.random() * 500) + 100 : null,
          fuelLevelOut: booking.status === 'CHECKED_OUT' || booking.status === 'CHECKED_IN' ? Math.floor(Math.random() * 30) + 70 : null,
          fuelLevelIn: booking.status === 'CHECKED_IN' ? Math.floor(Math.random() * 40) + 40 : null,
          notes: `Prenotazione di dicembre - ${booking.status}`,
        }
      });
      createdCount++;
      process.stdout.write('.');
    } catch (error: any) {
      console.log(`\n⚠️  Skipped booking (possible duplicate): ${error.message.substring(0, 50)}...`);
    }
  }

  console.log('');
  console.log(`\n✅ Created ${createdCount} December bookings!`);
  console.log('');
  console.log('📊 Summary:');
  console.log('   - Checked-In (completed): ~14 bookings');
  console.log('   - Checked-Out (active): ~4 bookings');
  console.log('   - Confirmed (upcoming): ~20 bookings');
  console.log('   - Cancelled: ~3 bookings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
