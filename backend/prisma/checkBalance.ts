import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'karan@gmail.com' },
  });

  if (!user) {
    console.log('User not found');
    process.exit(1);
  }

  // Get current month dates
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  console.log(`Checking balance for user: ${user.name} (${user.email})`);
  console.log(`Current month: ${currentMonthStart.toLocaleDateString()} to ${currentMonthEnd.toLocaleDateString()}`);

  // Get accounts and opening balance
  const accounts = await prisma.account.findMany({ where: { userId: user.id } });
  let totalOpeningBalance = 0;
  accounts.forEach((acc) => {
    console.log(`Account: ${acc.name}, Opening Balance: ₹${acc.openingBalance}`);
    totalOpeningBalance += acc.openingBalance;
  });

  // Get current month transactions
  const currentMonthTxs = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: currentMonthStart, lte: currentMonthEnd },
    },
  });

  let monthlyIncome = 0;
  let monthlyExpenses = 0;
  currentMonthTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      monthlyIncome += tx.amount;
    } else {
      monthlyExpenses += tx.amount;
    }
  });

  console.log(`\nCurrent Month (${(currentMonthStart.getMonth() + 1).toString().padStart(2, '0')}/${currentMonthStart.getFullYear()}):`);
  console.log(`  Income: ₹${monthlyIncome.toFixed(2)}`);
  console.log(`  Expenses: ₹${monthlyExpenses.toFixed(2)}`);
  console.log(`  Transactions count: ${currentMonthTxs.length}`);

  // Get all transactions for total balance
  const allTxs = await prisma.transaction.findMany({ where: { userId: user.id } });
  let totalTxBalance = 0;
  allTxs.forEach((tx) => {
    if (tx.type === 'INCOME') {
      totalTxBalance += tx.amount;
    } else {
      totalTxBalance -= tx.amount;
    }
  });

  const currentBalance = totalOpeningBalance + totalTxBalance;

  console.log(`\nBalance Calculation:`);
  console.log(`  Opening Balance (all accounts): ₹${totalOpeningBalance.toFixed(2)}`);
  console.log(`  + Net Transactions: ₹${totalTxBalance.toFixed(2)}`);
  console.log(`  = Current Balance: ₹${currentBalance.toFixed(2)}`);

  console.log(`\nExpected: ₹9,129.68`);
  console.log(`Difference: ₹${(9129.68 - currentBalance).toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  });
