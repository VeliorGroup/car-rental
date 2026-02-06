import 'dotenv/config';
import { PrismaClient, VehicleCategory, VehicleStatus, BookingStatus, CustomerCategory, CustomerStatus, MaintenanceType, MaintenancePriority, MaintenanceStatus, DamageSeverity, DamageStatus, CautionStatus, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to add days to date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  console.log('🌱 Starting demo data seed...\n');

  // Get the demo tenant
  const tenant = await prisma.tenant.findFirst({
    where: { subdomain: 'demo' }
  });

  if (!tenant) {
    console.error('Demo tenant not found! Run the main seed first.');
    return;
  }

  const tenantId = tenant.id;

  // ========================================
  // 1. CREATE BRANCHES (2 locations)
  // ========================================
  console.log('📍 Creating branches...');
  
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { tenantId_code: { tenantId, code: 'TIR' } },
      update: {},
      create: {
        tenantId,
        name: 'Tirana Sede Principale',
        code: 'TIR',
        address: 'Rruga Durrësit 123',
        city: 'Tirana',
        country: 'AL',
        phone: '+355 69 123 4567',
        email: 'tirana@demo.com',
        isDefault: true,
        openingHours: {
          mon: '08:00-18:00',
          tue: '08:00-18:00',
          wed: '08:00-18:00',
          thu: '08:00-18:00',
          fri: '08:00-18:00',
          sat: '09:00-14:00',
          sun: 'Chiuso'
        },
        coordinates: { lat: 41.3275, lng: 19.8187 }
      }
    }),
    prisma.branch.upsert({
      where: { tenantId_code: { tenantId, code: 'DUR' } },
      update: {},
      create: {
        tenantId,
        name: 'Durazzo Aeroporto',
        code: 'DUR',
        address: 'Aeroporto Internazionale Nënë Tereza',
        city: 'Durazzo',
        country: 'AL',
        phone: '+355 69 234 5678',
        email: 'durazzo@demo.com',
        isDefault: false,
        openingHours: {
          mon: '06:00-22:00',
          tue: '06:00-22:00',
          wed: '06:00-22:00',
          thu: '06:00-22:00',
          fri: '06:00-22:00',
          sat: '06:00-22:00',
          sun: '06:00-22:00'
        },
        coordinates: { lat: 41.4147, lng: 19.7206 }
      }
    })
  ]);

  console.log(`  ✅ Created ${branches.length} branches\n`);

  // ========================================
  // 2. CREATE VEHICLES (10 vehicles)
  // ========================================
  console.log('🚗 Creating vehicles...');

  const vehicleData = [
    { plate: 'AA001TI', brand: 'Fiat', model: 'Panda', year: 2022, category: VehicleCategory.ECONOMY, color: 'Bianco', km: 45000, branchIdx: 0 },
    { plate: 'AA002TI', brand: 'Fiat', model: '500', year: 2023, category: VehicleCategory.ECONOMY, color: 'Rosso', km: 28000, branchIdx: 0 },
    { plate: 'AA003TI', brand: 'Volkswagen', model: 'Polo', year: 2022, category: VehicleCategory.COMPACT, color: 'Grigio', km: 52000, branchIdx: 0 },
    { plate: 'AA004TI', brand: 'Ford', model: 'Focus', year: 2021, category: VehicleCategory.COMPACT, color: 'Blu', km: 67000, branchIdx: 0 },
    { plate: 'AA005TI', brand: 'Volkswagen', model: 'Golf', year: 2023, category: VehicleCategory.MIDSIZE, color: 'Nero', km: 18000, branchIdx: 0 },
    { plate: 'AA006DU', brand: 'Toyota', model: 'Corolla', year: 2022, category: VehicleCategory.MIDSIZE, color: 'Argento', km: 41000, branchIdx: 1 },
    { plate: 'AA007DU', brand: 'Skoda', model: 'Octavia', year: 2023, category: VehicleCategory.FULLSIZE, color: 'Bianco', km: 22000, branchIdx: 1 },
    { plate: 'AA008DU', brand: 'Dacia', model: 'Duster', year: 2022, category: VehicleCategory.SUV, color: 'Verde', km: 38000, branchIdx: 1 },
    { plate: 'AA009DU', brand: 'Nissan', model: 'Qashqai', year: 2023, category: VehicleCategory.SUV, color: 'Nero', km: 15000, branchIdx: 1 },
    { plate: 'AA010TI', brand: 'Mercedes', model: 'Classe A', year: 2023, category: VehicleCategory.LUXURY, color: 'Nero', km: 12000, branchIdx: 0 },
  ];

  const vehicles = [];
  for (const v of vehicleData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { licensePlate: v.plate },
      update: {},
      create: {
        tenantId,
        licensePlate: v.plate,
        brand: v.brand,
        model: v.model,
        year: v.year,
        category: v.category,
        color: v.color,
        currentKm: v.km,
        purchaseDate: new Date(v.year, 0, 15),
        insuranceExpiry: new Date(2025, 11, 31),
        reviewDate: new Date(2025, 5, 30),
        status: VehicleStatus.AVAILABLE,
        location: v.branchIdx === 0 ? 'Tirana' : 'Durazzo',
        branchId: branches[v.branchIdx].id,
        franchiseAmount: v.category === VehicleCategory.LUXURY ? 1000 : 500,
        fuelType: 'Benzina',
        transmission: v.category === VehicleCategory.LUXURY ? 'Automatico' : 'Manuale',
        seatCount: 5,
        doorCount: 5,
        features: ['Aria condizionata', 'Bluetooth', 'USB'],
        photos: []
      }
    });
    vehicles.push(vehicle);
  }

  console.log(`  ✅ Created ${vehicles.length} vehicles\n`);

  // ========================================
  // 3. CREATE CUSTOMERS (15 customers)
  // ========================================
  console.log('👥 Creating customers...');

  const customerNames = [
    { first: 'Marco', last: 'Rossi', email: 'marco.rossi@email.com' },
    { first: 'Giulia', last: 'Bianchi', email: 'giulia.bianchi@email.com' },
    { first: 'Andrea', last: 'Verdi', email: 'andrea.verdi@email.com' },
    { first: 'Sara', last: 'Ferrari', email: 'sara.ferrari@email.com' },
    { first: 'Luca', last: 'Romano', email: 'luca.romano@email.com' },
    { first: 'Chiara', last: 'Costa', email: 'chiara.costa@email.com' },
    { first: 'Paolo', last: 'Ricci', email: 'paolo.ricci@email.com' },
    { first: 'Francesca', last: 'Gallo', email: 'francesca.gallo@email.com' },
    { first: 'Alessandro', last: 'Esposito', email: 'alessandro.esposito@email.com' },
    { first: 'Valentina', last: 'Bruno', email: 'valentina.bruno@email.com' },
    { first: 'Giovanni', last: 'Greco', email: 'giovanni.greco@email.com' },
    { first: 'Elena', last: 'De Luca', email: 'elena.deluca@email.com' },
    { first: 'Matteo', last: 'Mancini', email: 'matteo.mancini@email.com' },
    { first: 'Sofia', last: 'Colombo', email: 'sofia.colombo@email.com' },
    { first: 'Federico', last: 'Barbieri', email: 'federico.barbieri@email.com' },
  ];

  const customers = [];
  let licenseNum = 1000;
  for (const c of customerNames) {
    const customer = await prisma.customer.upsert({
      where: { licenseNumber: `IT${licenseNum}XY` },
      update: {},
      create: {
        tenantId,
        firstName: c.first,
        lastName: c.last,
        email: c.email,
        phone: `+39 ${Math.floor(300 + Math.random() * 100)} ${Math.floor(1000000 + Math.random() * 9000000)}`,
        dateOfBirth: new Date(1970 + Math.floor(Math.random() * 30), Math.floor(Math.random() * 12), Math.floor(1 + Math.random() * 28)),
        idCardNumber: `CA${Math.floor(10000000 + Math.random() * 90000000)}`,
        licenseNumber: `IT${licenseNum}XY`,
        licenseExpiry: new Date(2028, Math.floor(Math.random() * 12), 15),
        address: `Via Roma ${Math.floor(1 + Math.random() * 200)}`,
        city: ['Roma', 'Milano', 'Napoli', 'Torino', 'Bologna'][Math.floor(Math.random() * 5)],
        country: 'Italia',
        category: Math.random() > 0.8 ? CustomerCategory.BUSINESS : CustomerCategory.STANDARD,
        status: CustomerStatus.ACTIVE,
        discountPercentage: Math.random() > 0.7 ? Math.floor(5 + Math.random() * 10) : 0
      }
    });
    customers.push(customer);
    licenseNum++;
  }

  console.log(`  ✅ Created ${customers.length} customers\n`);

  // ========================================
  // 4. GET ADMIN USER FOR BOOKINGS
  // ========================================
  const adminUser = await prisma.user.findFirst({
    where: { tenantId, email: 'business@carrental.com' }
  });

  if (!adminUser) {
    console.error('Admin user not found! Make sure to run seed-demo-users.ts first.');
    return;
  }

  // ========================================
  // 5. CREATE BOOKINGS (November & December 2025)
  // ========================================
  console.log('📅 Creating bookings for November-December 2025...');

  const dailyPrices: Record<VehicleCategory, number> = {
    [VehicleCategory.ECONOMY]: 35,
    [VehicleCategory.COMPACT]: 45,
    [VehicleCategory.MIDSIZE]: 55,
    [VehicleCategory.FULLSIZE]: 70,
    [VehicleCategory.SUV]: 80,
    [VehicleCategory.LUXURY]: 120,
    [VehicleCategory.VAN]: 90,
  };

  // Generate ~40 bookings across November and December
  const bookings = [];
  const novStart = new Date(2025, 10, 1); // November 1, 2025
  const decEnd = new Date(2025, 11, 31);  // December 31, 2025
  const today = new Date();

  for (let i = 0; i < 40; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const startDate = randomDate(novStart, new Date(2025, 11, 20));
    const duration = Math.floor(2 + Math.random() * 8); // 2-10 days
    const endDate = addDays(startDate, duration);
    
    const dailyPrice = dailyPrices[vehicle.category];
    const basePrice = dailyPrice * duration;
    const discountAmount = customer.discountPercentage ? (basePrice * customer.discountPercentage / 100) : 0;
    const totalAmount = basePrice - discountAmount;
    
    // Determine status based on dates
    let status: BookingStatus;
    if (endDate < today) {
      status = BookingStatus.CHECKED_IN; // Past bookings are completed
    } else if (startDate < today && endDate >= today) {
      status = BookingStatus.CHECKED_OUT; // Currently rented
    } else {
      status = BookingStatus.CONFIRMED; // Future bookings
    }

    const pickupBranch = branches[Math.floor(Math.random() * branches.length)];
    const dropoffBranch = Math.random() > 0.7 ? branches[Math.floor(Math.random() * branches.length)] : pickupBranch;

    try {
      const booking = await prisma.booking.create({
        data: {
          tenantId,
          customerId: customer.id,
          vehicleId: vehicle.id,
          startDate,
          endDate,
          status,
          basePrice,
          dailyPrice,
          totalAmount,
          discountAmount,
          extras: [],
          cautionAmount: vehicle.category === VehicleCategory.LUXURY ? 1000 : 300,
          kmOut: status !== BookingStatus.CONFIRMED ? vehicle.currentKm : null,
          kmIn: status === BookingStatus.CHECKED_IN ? vehicle.currentKm + Math.floor(100 + Math.random() * 500) : null,
          fuelLevelOut: status !== BookingStatus.CONFIRMED ? Math.floor(70 + Math.random() * 30) : null,
          fuelLevelIn: status === BookingStatus.CHECKED_IN ? Math.floor(70 + Math.random() * 30) : null,
          createdById: adminUser.id,
          pickupBranchId: pickupBranch.id,
          dropoffBranchId: dropoffBranch.id,
        }
      });
      bookings.push(booking);

      // Create caution for checked-out and completed bookings
      if (status !== BookingStatus.CONFIRMED) {
        await prisma.caution.create({
          data: {
            tenantId,
            bookingId: booking.id,
            amount: booking.cautionAmount,
            status: status === BookingStatus.CHECKED_IN ? CautionStatus.RELEASED : CautionStatus.HELD,
            paymentMethod: PaymentMethod.CASH,
            heldAt: startDate,
            releasedAt: status === BookingStatus.CHECKED_IN ? endDate : null
          }
        });
      }
    } catch (e) {
      // Skip if booking already exists or constraint violation
    }
  }

  console.log(`  ✅ Created ${bookings.length} bookings\n`);

  // ========================================
  // 6. CREATE MAINTENANCE RECORDS
  // ========================================
  console.log('🔧 Creating maintenance records...');

  const maintenanceTypes = [
    { type: MaintenanceType.OIL_CHANGE, title: 'Cambio olio', cost: 80 },
    { type: MaintenanceType.TIRE_CHANGE, title: 'Cambio gomme', cost: 200 },
    { type: MaintenanceType.BRAKE_SERVICE, title: 'Revisione freni', cost: 150 },
    { type: MaintenanceType.INSPECTION, title: 'Ispezione generale', cost: 50 },
    { type: MaintenanceType.ROUTINE, title: 'Manutenzione ordinaria', cost: 100 },
  ];

  let maintenanceCount = 0;
  for (let i = 0; i < 12; i++) {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    const mType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
    const scheduledFor = randomDate(novStart, decEnd);
    const isCompleted = scheduledFor < today;

    try {
      await prisma.maintenance.create({
        data: {
          tenantId,
          vehicleId: vehicle.id,
          title: `${mType.title} - ${vehicle.brand} ${vehicle.model}`,
          type: mType.type,
          description: `Manutenzione programmata per il veicolo ${vehicle.licensePlate}`,
          priority: MaintenancePriority.MEDIUM,
          status: isCompleted ? MaintenanceStatus.COMPLETED : MaintenanceStatus.SCHEDULED,
          scheduledFor,
          completedAt: isCompleted ? addDays(scheduledFor, 1) : null,
          cost: mType.cost,
          notes: []
        }
      });
      maintenanceCount++;
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`  ✅ Created ${maintenanceCount} maintenance records\n`);

  // ========================================
  // 7. CREATE SOME DAMAGES
  // ========================================
  console.log('⚠️ Creating damage records...');

  const completedBookings = bookings.filter(b => b.status === BookingStatus.CHECKED_IN).slice(0, 3);
  let damageCount = 0;

  const damageTypes = [
    { type: 'Graffio', severity: DamageSeverity.MINOR, cost: 150 },
    { type: 'Ammaccatura', severity: DamageSeverity.MODERATE, cost: 400 },
    { type: 'Vetro rotto', severity: DamageSeverity.MODERATE, cost: 300 },
  ];

  for (const booking of completedBookings) {
    const dmg = damageTypes[Math.floor(Math.random() * damageTypes.length)];
    try {
      await prisma.damage.create({
        data: {
          tenantId,
          bookingId: booking.id,
          vehicleId: booking.vehicleId,
          severity: dmg.severity,
          type: dmg.type,
          position: ['Anteriore', 'Posteriore', 'Laterale sinistro', 'Laterale destro'][Math.floor(Math.random() * 4)],
          description: `${dmg.type} rilevato al check-in`,
          estimatedCost: dmg.cost,
          franchiseApplied: Math.min(dmg.cost, 500),
          photos: [],
          status: DamageStatus.RESOLVED
        }
      });
      damageCount++;
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log(`  ✅ Created ${damageCount} damage records\n`);

  // ========================================
  // 8. UPDATE CUSTOMER STATS
  // ========================================
  console.log('📊 Updating customer statistics...');

  for (const customer of customers) {
    const customerBookings = await prisma.booking.findMany({
      where: { customerId: customer.id }
    });
    
    const totalSpent = customerBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalBookings: customerBookings.length,
        totalSpent
      }
    });
  }

  console.log('  ✅ Customer statistics updated\n');

  console.log('🎉 Demo data seeding completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - ${branches.length} Branches`);
  console.log(`   - ${vehicles.length} Vehicles`);
  console.log(`   - ${customers.length} Customers`);
  console.log(`   - ${bookings.length} Bookings`);
  console.log(`   - ${maintenanceCount} Maintenance records`);
  console.log(`   - ${damageCount} Damage reports`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
