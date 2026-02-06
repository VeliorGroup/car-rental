import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Adding cautions, damages, and maintenance records...');
  
  // Get existing tenant
  const tenant = await prisma.tenant.findFirst({ where: { subdomain: 'demo' } });
  if (!tenant) {
    console.log('No tenant found, run seed.ts first');
    return;
  }

  // Get existing bookings and vehicles
  const bookings = await prisma.booking.findMany({
    where: { tenantId: tenant.id },
    include: { vehicle: true, customer: true },
    take: 10,
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { tenantId: tenant.id },
    take: 10,
  });

  if (bookings.length === 0 || vehicles.length === 0) {
    console.log('No bookings or vehicles found, run reset-and-seed.ts first');
    return;
  }

  // Create Cautions
  console.log('💰 Creating cautions...');
  const cautionStatuses = ['HELD', 'RELEASED', 'FULLY_CHARGED', 'PENDING'] as const;
  const paymentMethods = ['CASH', 'PAYSERA'] as const;
  
  for (let i = 0; i < Math.min(5, bookings.length); i++) {
    const booking = bookings[i];
    const status = cautionStatuses[i % cautionStatuses.length];
    
    // Delete existing caution for this booking if any
    await prisma.caution.deleteMany({
      where: { bookingId: booking.id }
    });

    await prisma.caution.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        amount: 300 + (i * 50),
        status: status,
        paymentMethod: paymentMethods[i % 2],
        heldAt: status !== 'PENDING' ? new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000) : null,
        releasedAt: status === 'RELEASED' ? new Date() : null,
        chargedAt: status === 'FULLY_CHARGED' ? new Date() : null,
        chargedAmount: status === 'FULLY_CHARGED' ? 150 : null,
      }
    });
  }
  console.log('✅ Created cautions');

  // Create Damages
  console.log('🔨 Creating damages...');
  const damageTypes = ['Graffio', 'Ammaccatura', 'Vetro rotto', 'Specchietto danneggiato', 'Faro rotto'];
  const damagePositions = ['Porta anteriore sinistra', 'Paraurti posteriore', 'Cofano', 'Porta posteriore destra', 'Fianco destro'];
  const damageSeverities = ['MINOR', 'MODERATE', 'SEVERE'] as const;
  const damageStatuses = ['REPORTED', 'ASSESSED', 'REPAIRED', 'RESOLVED'] as const;

  for (let i = 0; i < Math.min(5, bookings.length); i++) {
    const booking = bookings[i];
    
    await prisma.damage.create({
      data: {
        tenantId: tenant.id,
        bookingId: booking.id,
        vehicleId: booking.vehicleId,
        severity: damageSeverities[i % damageSeverities.length],
        type: damageTypes[i],
        position: damagePositions[i],
        description: `Danno rilevato durante il check-in: ${damageTypes[i]} sulla ${damagePositions[i].toLowerCase()}`,
        estimatedCost: 100 + (i * 75),
        actualCost: i % 2 === 0 ? 120 + (i * 70) : null,
        franchiseApplied: i % 3 === 0 ? 200 : 0,
        photos: [],
        status: damageStatuses[i % damageStatuses.length],
        disputed: i === 3,
        disputeReason: i === 3 ? 'Il cliente contesta il danno' : null,
      }
    });
  }
  console.log('✅ Created damages');

  // Create Maintenance
  console.log('🔧 Creating maintenance records...');
  const maintenanceTypes = ['ROUTINE', 'REPAIR', 'INSPECTION', 'TIRE_CHANGE', 'OIL_CHANGE', 'BRAKE_SERVICE'] as const;
  const maintenanceTitles = [
    'Cambio olio e filtri',
    'Riparazione freno anteriore',
    'Ispezione annuale',
    'Cambio pneumatici invernali',
    'Sostituzione pastiglie freno',
    'Manutenzione ordinaria'
  ];
  const maintenanceStatuses = ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
  const maintenancePriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

  for (let i = 0; i < Math.min(8, vehicles.length); i++) {
    const vehicle = vehicles[i % vehicles.length];
    const status = maintenanceStatuses[i % maintenanceStatuses.length];
    const scheduledFor = new Date(Date.now() + (i - 3) * 7 * 24 * 60 * 60 * 1000); // Some past, some future

    await prisma.maintenance.create({
      data: {
        tenantId: tenant.id,
        vehicleId: vehicle.id,
        title: maintenanceTitles[i % maintenanceTitles.length],
        type: maintenanceTypes[i % maintenanceTypes.length],
        description: `Manutenzione programmata per ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`,
        priority: maintenancePriorities[i % maintenancePriorities.length],
        status: status,
        scheduledFor,
        completedAt: status === 'COMPLETED' ? new Date() : null,
        cost: status === 'COMPLETED' ? 50 + (i * 30) : null,
        notes: [`Nota ${i + 1}: Verificare lo stato generale del veicolo`],
        photos: [],
      }
    });
  }
  console.log('✅ Created maintenance records');

  console.log('');
  console.log('🎉 All sample data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
