import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Reading CSV file...');
  const csvPath = path.join('/data/projects/2026/expenseTracker/Daily Expenses - June Expense.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');

  // Ensure default user exists
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
  console.log(`Using user: ${user.name} (${user.email})`);

  let importedCount = 0;

  // Header is at line 4 (index 3). Data starts at line 5 (index 4).
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length < 5) continue;

    const rawDate = parts[0].trim(); // e.g. "1 June"
    let description = parts[1]?.trim() || '';
    let category = parts[2]?.trim() || '';
    const rawIncome = parts[3]?.trim() || '';
    const rawExpense = parts[4]?.trim() || '';

    // Ignore totals/summary rows
    if (rawDate === 'Date' || (!rawIncome && !rawExpense)) continue;

    // Parse date: e.g. "1 June" -> "2026-06-01"
    const dateParts = rawDate.split(' ');
    const day = parseInt(dateParts[0]);
    let month = 5; // default June (0-indexed)
    if (dateParts[1] && dateParts[1].toLowerCase().includes('june')) {
      month = 5;
    }
    const date = new Date(2026, month, day, 12, 0, 0);

    const income = rawIncome ? parseFloat(rawIncome) : 0;
    const expense = rawExpense ? parseFloat(rawExpense) : 0;

    const amount = income > 0 ? income : expense;
    const type = income > 0 ? 'INCOME' : 'EXPENSE';

    if (isNaN(amount) || amount === 0) continue;

    if (!description) {
      description = type === 'INCOME' ? 'Generic Income' : 'Generic Expense';
    }

    if (!category) {
      category = autoCategorize(description);
    }

    // Map some categories from CSV naming standard to DB standard
    if (category.toLowerCase() === 'savings') category = 'Investment';
    if (category.toLowerCase() === 'medicine') category = 'Medical';

    await prisma.transaction.create({
      data: {
        userId: user.id,
        date,
        description,
        category,
        amount,
        type,
        paymentMode: 'CASH', // default fallback
        account: 'Cash Account',
        tags: ['june-import'],
      },
    });

    importedCount++;
  }

  console.log(`Successfully imported ${importedCount} June transactions!`);
}

function autoCategorize(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('cloth')) return 'Clothes';
  if (desc.includes('bill') || desc.includes('elect')) return 'Utilities';
  if (desc.includes('food') || desc.includes('samose') || desc.includes('sweet') || desc.includes('pastry') || desc.includes('jalebi') || desc.includes('cake')) return 'Food';
  if (desc.includes('emi') || desc.includes('loan')) return 'Loan';
  if (desc.includes('salary')) return 'Salary';
  if (desc.includes('petrol')) return 'Fuel';
  if (desc.includes('sip') || desc.includes('nps')) return 'Investment';
  if (desc.includes('liquor')) return 'Liquor';
  if (desc.includes('lic')) return 'Insurance';
  if (desc.includes('amazon')) return 'Shopping';
  if (desc.includes('med') || desc.includes('tarun') || desc.includes('mom')) return 'Medical';
  return 'Misc';
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
