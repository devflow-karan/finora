import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database with default user and full demo dataset...');

  const passwordHash = await bcrypt.hash('Password@123', 12);

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
    update: { openingBalance: 0 },
    create: {
      id: `account_${user.id}`,
      userId: user.id,
      name: 'Primary Account',
      openingBalance: 0,
      currency: 'INR',
    },
  });

  console.log(
    `Account created: ${account.name} with opening balance ₹${account.openingBalance}`,
  );

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
