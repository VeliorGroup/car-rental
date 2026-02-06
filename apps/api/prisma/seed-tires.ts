import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedTires() {
  console.log('🛞 Creating tire records...\n');
  
  const tenant = await prisma.tenant.findFirst({ where: { subdomain: 'demo' } });
  if (!tenant) { 
    console.log('No demo tenant found!'); 
    return; 
  }
  
  const vehicles = await prisma.vehicle.findMany({ where: { tenantId: tenant.id } });
  
  const tireBrands = ['Michelin', 'Continental', 'Pirelli', 'Bridgestone', 'Goodyear'];
  const tireModels = ['Primacy 4', 'CrossContact', 'Cinturato P7', 'Turanza T005', 'EfficientGrip'];
  const positions = ['FL', 'FR', 'RL', 'RR'];
  const seasons = ['SUMMER', 'WINTER', 'ALL_SEASON'];
  
  let count = 0;
  for (const vehicle of vehicles) {
    const brandIdx = Math.floor(Math.random() * tireBrands.length);
    const brand = tireBrands[brandIdx];
    const model = tireModels[brandIdx];
    const season = seasons[Math.floor(Math.random() * seasons.length)];
    const mountDate = new Date(2024, Math.floor(Math.random() * 12), 15);
    const mountKm = Math.max(0, vehicle.currentKm - Math.floor(Math.random() * 15000));
    
    // Determine tire size based on vehicle category
    let size = '205/55R16';
    if (vehicle.category === 'SUV') size = '225/55R18';
    if (vehicle.category === 'LUXURY') size = '225/45R17';
    if (vehicle.category === 'ECONOMY') size = '185/65R15';
    
    // Create 4 tires per vehicle (one for each position)
    for (const pos of positions) {
      try {
        await prisma.tire.create({
          data: {
            tenantId: tenant.id,
            vehicleId: vehicle.id,
            brand,
            model,
            size,
            position: pos,
            mountDate,
            mountKm,
            currentKm: vehicle.currentKm,
            cost: 80 + Math.floor(Math.random() * 60),
            season,
            location: 'Veicolo',
            notes: `Pneumatico ${season.toLowerCase()} montato sul veicolo ${vehicle.licensePlate}`
          }
        });
        count++;
      } catch (e) {
        // Skip if already exists
      }
    }
    console.log(`  ✅ ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) - 4 pneumatici ${brand}`);
  }
  
  // Also create some spare tires in warehouse
  console.log('\n📦 Creating warehouse spare tires...');
  const spareBrands = ['Michelin', 'Continental', 'Pirelli'];
  for (let i = 0; i < 8; i++) {
    const brand = spareBrands[Math.floor(Math.random() * spareBrands.length)];
    const sizes = ['205/55R16', '225/55R18', '185/65R15'];
    
    await prisma.tire.create({
      data: {
        tenantId: tenant.id,
        vehicleId: vehicles[0].id, // Assigned to first vehicle but stored in warehouse
        brand,
        model: 'Spare',
        size: sizes[Math.floor(Math.random() * sizes.length)],
        position: 'SPARE',
        mountDate: new Date(2024, 6, 1),
        mountKm: 0,
        currentKm: 0,
        cost: 90 + Math.floor(Math.random() * 40),
        season: 'ALL_SEASON',
        location: 'Magazzino Tirana',
        notes: 'Pneumatico di scorta in magazzino'
      }
    });
    count++;
  }
  
  console.log(`\n🎉 Created ${count} tire records total!`);
  console.log(`   - ${vehicles.length * 4} on vehicles`);
  console.log(`   - 8 spare tires in warehouse`);
  
  await prisma.$disconnect();
}

seedTires().catch(console.error);
