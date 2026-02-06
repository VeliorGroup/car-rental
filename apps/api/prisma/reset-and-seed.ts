import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing existing data (except tenant and user)...');
  
  // Get existing tenant and user IDs
  const tenant = await prisma.tenant.findFirst({ where: { subdomain: 'demo' } });
  if (!tenant) {
    console.log('No tenant found, run seed.ts first');
    return;
  }

  // Delete all data in order (respecting foreign keys)
  await prisma.payment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.priceOverrideLog.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.caution.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.damage.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.booking.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.maintenance.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.tire.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.vehicle.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.customer.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.branch.deleteMany({ where: { tenantId: tenant.id } });
  
  console.log('✅ Data cleared!');

  // Get admin user for createdBy references
  const admin = await prisma.user.findFirst({ where: { tenantId: tenant.id } });
  if (!admin) {
    console.log('No admin user found');
    return;
  }

  // Create Branches
  console.log('🏢 Creating branches...');
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Sede Tirana Centro',
        code: 'TIR',
        address: 'Rruga Myslym Shyri 42',
        city: 'Tirana',
        country: 'AL',
        phone: '+355 4 234 5678',
        email: 'tirana@carrental.al',
        isActive: true,
        isDefault: true,
      }
    }),
    prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Aeroporto Rinas',
        code: 'RNS',
        address: 'Aeroporto Internazionale Nënë Tereza',
        city: 'Rinas',
        country: 'AL',
        phone: '+355 4 381 8000',
        email: 'airport@carrental.al',
        isActive: true,
        isDefault: false,
      }
    }),
    prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'Sede Durazzo',
        code: 'DUR',
        address: 'Rruga Tregtare 15',
        city: 'Durazzo',
        country: 'AL',
        phone: '+355 52 234 567',
        email: 'durres@carrental.al',
        isActive: true,
        isDefault: false,
      }
    }),
  ]);
  console.log(`✅ Created ${branches.length} branches`);

  // Create Vehicles
  console.log('🚗 Creating vehicles...');
  const vehicleData = [
    { brand: 'Toyota', model: 'Corolla', plate: 'AA 123 BB', category: 'COMPACT', km: 45000 },
    { brand: 'Volkswagen', model: 'Golf', plate: 'AA 456 CC', category: 'COMPACT', km: 32000 },
    { brand: 'Mercedes', model: 'C-Class', plate: 'AA 789 DD', category: 'LUXURY', km: 28000 },
    { brand: 'BMW', model: '320i', plate: 'AA 012 EE', category: 'LUXURY', km: 35000 },
    { brand: 'Fiat', model: 'Panda', plate: 'AA 345 FF', category: 'ECONOMY', km: 68000 },
    { brand: 'Renault', model: 'Clio', plate: 'AA 678 GG', category: 'ECONOMY', km: 52000 },
    { brand: 'Hyundai', model: 'Tucson', plate: 'AA 901 HH', category: 'SUV', km: 41000 },
    { brand: 'Nissan', model: 'Qashqai', plate: 'AA 234 II', category: 'SUV', km: 38000 },
    { brand: 'Ford', model: 'Transit', plate: 'AA 567 JJ', category: 'VAN', km: 75000 },
    { brand: 'Peugeot', model: '308', plate: 'AA 890 KK', category: 'MIDSIZE', km: 29000 },
  ];

  const vehicles = await Promise.all(vehicleData.map((v, i) => 
    prisma.vehicle.create({
      data: {
        tenantId: tenant.id,
        branchId: branches[i % branches.length].id,
        licensePlate: v.plate,
        brand: v.brand,
        model: v.model,
        year: 2022 - (i % 3),
        category: v.category as any,
        color: ['Bianco', 'Nero', 'Grigio', 'Rosso', 'Blu'][i % 5],
        currentKm: v.km,
        purchaseDate: new Date(2021, i % 12, 15),
        purchasePrice: 15000 + (i * 2000),
        insuranceExpiry: new Date(2025, (i + 3) % 12, 28),
        reviewDate: new Date(2025, (i + 6) % 12, 15),
        status: 'AVAILABLE',
        location: branches[i % branches.length].city,
        fuelType: ['Diesel', 'Petrol', 'Hybrid'][i % 3],
        transmission: i % 2 === 0 ? 'Manual' : 'Automatic',
        seatCount: v.category === 'VAN' ? 9 : 5,
        doorCount: v.category === 'VAN' ? 5 : 4,
        features: ['Aria condizionata', 'Bluetooth', 'GPS'],
        photos: [],
      }
    })
  ));
  console.log(`✅ Created ${vehicles.length} vehicles`);

  // Create Customers
  console.log('👥 Creating customers...');
  const customerData = [
    { firstName: 'Marco', lastName: 'Rossi', email: 'marco.rossi@email.com', phone: '+39 333 1234567' },
    { firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia.bianchi@email.com', phone: '+39 334 2345678' },
    { firstName: 'Luca', lastName: 'Verdi', email: 'luca.verdi@email.com', phone: '+39 335 3456789' },
    { firstName: 'Sofia', lastName: 'Russo', email: 'sofia.russo@email.com', phone: '+39 336 4567890' },
    { firstName: 'Alessandro', lastName: 'Ferrari', email: 'alessandro.ferrari@email.com', phone: '+39 337 5678901' },
    { firstName: 'Francesca', lastName: 'Esposito', email: 'francesca.esposito@email.com', phone: '+39 338 6789012' },
    { firstName: 'Arben', lastName: 'Hoxha', email: 'arben.hoxha@email.com', phone: '+355 69 1234567' },
    { firstName: 'Erjona', lastName: 'Shehu', email: 'erjona.shehu@email.com', phone: '+355 69 2345678' },
  ];

  const customers = await Promise.all(customerData.map((c, i) => 
    prisma.customer.create({
      data: {
        tenantId: tenant.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,

        idCardNumber: `AB${1000000 + i}`,
        dateOfBirth: new Date(1980 + (i * 3), i % 12, 10 + i),
        address: `Via Roma ${100 + i}`,
        city: ['Roma', 'Milano', 'Napoli', 'Torino', 'Tirana', 'Durazzo'][i % 6],
        country: i < 6 ? 'IT' : 'AL',
        licenseNumber: `U${2000000 + i}`,
        licenseExpiry: new Date(2027, (i + 6) % 12, 20),
        notes: '',
      }
    })
  ));
  console.log(`✅ Created ${customers.length} customers`);

  // Create Bookings
  console.log('📅 Creating bookings...');
  const today = new Date();
  const bookingData = [
    // Past bookings
    { daysAgo: 15, duration: 5, customerIdx: 0, vehicleIdx: 0, status: 'COMPLETED' },
    { daysAgo: 10, duration: 3, customerIdx: 1, vehicleIdx: 1, status: 'COMPLETED' },
    // Current active bookings
    { daysAgo: 2, duration: 5, customerIdx: 2, vehicleIdx: 2, status: 'ACTIVE' },
    { daysAgo: 1, duration: 4, customerIdx: 3, vehicleIdx: 3, status: 'ACTIVE' },
    // Future bookings
    { daysAgo: -2, duration: 7, customerIdx: 4, vehicleIdx: 4, status: 'CONFIRMED' },
    { daysAgo: -5, duration: 3, customerIdx: 5, vehicleIdx: 5, status: 'CONFIRMED' },
    { daysAgo: -7, duration: 10, customerIdx: 6, vehicleIdx: 6, status: 'PENDING' },
    { daysAgo: -10, duration: 4, customerIdx: 7, vehicleIdx: 7, status: 'CONFIRMED' },
  ];

  const bookings = await Promise.all(bookingData.map(async (b, i) => {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - b.daysAgo);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + b.duration);
    
    const dailyPrice = 50 + (i * 10);
    const totalAmount = dailyPrice * b.duration;

    return prisma.booking.create({
      data: {
        tenantId: tenant.id,
        customerId: customers[b.customerIdx].id,
        vehicleId: vehicles[b.vehicleIdx].id,
        pickupBranchId: branches[i % branches.length].id,
        dropoffBranchId: branches[(i + 1) % branches.length].id,
        startDate,
        endDate,
        status: b.status as any,
        basePrice: dailyPrice,
        dailyPrice,
        totalAmount,
        discountAmount: 0,
        extras: [],
        cautionAmount: 300,
        createdById: admin.id,
      }
    });
  }));
  console.log(`✅ Created ${bookings.length} bookings`);

  // Update vehicle status for active bookings
  await prisma.vehicle.update({
    where: { id: vehicles[2].id },
    data: { status: 'RENTED' }
  });
  await prisma.vehicle.update({
    where: { id: vehicles[3].id },
    data: { status: 'RENTED' }
  });

  console.log('');
  console.log('🎉 Sample data created successfully!');
  console.log(`   - ${branches.length} branches`);
  console.log(`   - ${vehicles.length} vehicles`);
  console.log(`   - ${customers.length} customers`);
  console.log(`   - ${bookings.length} bookings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
