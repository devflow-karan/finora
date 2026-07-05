import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Purging all database records...');
  
  // Delete in order to satisfy foreign key constraints
  await prisma.aIInsight.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.extraPayment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.insurance.deleteMany();
  await prisma.financialGoal.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.user.deleteMany();

  console.log('Database purge complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
