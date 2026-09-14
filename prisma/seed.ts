import { PrismaClient } from '@prisma/client';
import { seedFranchises } from '../src/lib/seed-franchises';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');
  await seedFranchises();
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error executing seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });