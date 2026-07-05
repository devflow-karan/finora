import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with default user and investments...');

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'karan@gmail.com' },
    update: {},
    create: {
      email: 'karan@gmail.com',
      passwordHash,
      name: 'Sacher Family',
    },
  });

  console.log(`User: ${user.name} (${user.email})`);

  // Create account for user with opening balance
  const account = await prisma.account.upsert({
    where: { id: `account_${user.id}` },
    update: { openingBalance: 97809.04 },
    create: {
      id: `account_${user.id}`,
      userId: user.id,
      name: 'Primary Account',
      openingBalance: 97809.04,
      currency: 'INR',
    },
  });

  console.log(`Account created: ${account.name} with opening balance ₹${account.openingBalance}`);

  // Clear existing investments only (keep transactions intact)
  await prisma.investment.deleteMany({ where: { userId: user.id } });

  // Seed real mutual fund portfolio
  await prisma.investment.createMany({
    data: [
      {
        userId: user.id,
        name: 'Quant ELSS Tax Saver Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 53523,
        navOrPrice: 212.74,
        purchaseDate: new Date('2023-01-01'),
        value: 66643,
        profit: 13120,
      },
      {
        userId: user.id,
        name: 'SBI ELSS Tax Saver Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 45498,
        navOrPrice: 20.83,
        purchaseDate: new Date('2023-01-01'),
        value: 51835,
        profit: 6337,
      },
      {
        userId: user.id,
        name: 'Motilal Oswal Multi Cap Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 19694,
        navOrPrice: 105.00,
        purchaseDate: new Date('2023-06-01'),
        value: 26036,
        profit: 6342,
      },
      {
        userId: user.id,
        name: 'UTI Nifty 50 Index Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 8000,
        navOrPrice: 35.12,
        purchaseDate: new Date('2024-01-01'),
        value: 8239,
        profit: 239,
      },
      {
        userId: user.id,
        name: 'Parag Parikh Flexi Cap Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 6000,
        navOrPrice: 28.79,
        purchaseDate: new Date('2024-01-01'),
        value: 6100,
        profit: 100,
      },
      {
        userId: user.id,
        name: 'Bandhan Small Cap Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 5000,
        navOrPrice: 8.69,
        purchaseDate: new Date('2024-01-01'),
        value: 5298,
        profit: 298,
      },
      {
        userId: user.id,
        name: 'Canara Robeco Small Cap Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 4000,
        navOrPrice: 8.67,
        purchaseDate: new Date('2024-06-01'),
        value: 4325,
        profit: 325,
      },
      {
        userId: user.id,
        name: 'Motilal Oswal Midcap Fund Direct Growth',
        type: 'MUTUAL_FUND',
        principal: 4000,
        navOrPrice: 4.36,
        purchaseDate: new Date('2024-06-01'),
        value: 4311,
        profit: 311,
      },
    ],
  });

  console.log('Seeded 8 mutual fund investments.');
  console.log('Database Seeding Complete!');
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
