import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(userId: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // 1. Get all accounts for user and sum opening balances
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });
    const totalOpeningBalance = accounts.reduce(
      (sum, acc) => sum + acc.openingBalance,
      0,
    );

    // 2. Transactions this month
    const currentMonthTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    for (const tx of currentMonthTransactions) {
      if (tx.type === 'INCOME') {
        monthlyIncome += tx.amount;
      } else {
        monthlyExpenses += tx.amount;
      }
    }

    const savings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;

    // 3. All time transactions to estimate current bank/cash balance
    // Current balance = sum(opening balances) + sum(all transactions since opening)
    const allTransactions = await this.prisma.transaction.findMany({
      where: { userId },
    });

    let txBalance = 0;
    for (const tx of allTransactions) {
      if (tx.type === 'INCOME') {
        txBalance += tx.amount;
      } else {
        txBalance -= tx.amount;
      }
    }

    const currentBalance = totalOpeningBalance + txBalance;

    // 3. Investments summary
    const investments = await this.prisma.investment.findMany({
      where: { userId },
    });
    const totalInvestments = investments.reduce(
      (sum, inv) => sum + inv.value,
      0,
    );

    // 4. Loans summary
    const loans = await this.prisma.loan.findMany({
      where: { userId },
    });
    const totalLoans = loans.reduce((sum, loan) => sum + loan.outstanding, 0);

    // 5. Emergency Fund progress
    const emergencyGoal = await this.prisma.financialGoal.findFirst({
      where: { userId, type: 'EMERGENCY_FUND' },
      include: { investments: true },
    });
    const emergencyFundValue = emergencyGoal
      ? emergencyGoal.currentAmount +
        emergencyGoal.investments.reduce((sum, inv) => sum + inv.value, 0)
      : 0;
    const emergencyFundTarget = emergencyGoal ? emergencyGoal.targetAmount : 0;

    // 6. Net Worth
    // Assets: cash/bank balance + investments
    // Liabilities: loans outstanding
    const assets = Math.max(0, currentBalance) + totalInvestments;
    const liabilities = totalLoans;
    const netWorth = assets - liabilities;

    // 7. Financial Independence (FI) Progress
    // FI Target = 300x current monthly expenses (25x annual expenses rule)
    // If current expenses is 0, use a baseline of Rs 50,000 / month
    const averageMonthlyExpenses =
      monthlyExpenses > 0 ? monthlyExpenses : 50000;
    const fiTarget = averageMonthlyExpenses * 300;
    const fiProgressPct =
      fiTarget > 0 ? (totalInvestments / fiTarget) * 100 : 0;

    // 8. Trends & Charts
    const expenseTrend = await this.getCategoryBreakdown(
      userId,
      currentMonthStart,
      currentMonthEnd,
    );
    const cashFlowTrend = await this.getWeeklyCashFlowTrend(userId);

    return {
      cards: {
        currentBalance: Number(currentBalance.toFixed(2)),
        monthlyIncome: Number(monthlyIncome.toFixed(2)),
        monthlyExpenses: Number(monthlyExpenses.toFixed(2)),
        savingsRate: Number(savingsRate.toFixed(2)),
        netWorth: Number(netWorth.toFixed(2)),
        totalInvestments: Number(totalInvestments.toFixed(2)),
        totalLoans: Number(totalLoans.toFixed(2)),
        emergencyFund: {
          current: Number(emergencyFundValue.toFixed(2)),
          target: Number(emergencyFundTarget.toFixed(2)),
        },
        financialIndependence: {
          progressPercentage: Number(Math.min(100, fiProgressPct).toFixed(2)),
          target: Number(fiTarget.toFixed(2)),
        },
      },
      charts: {
        expenseTrend,
        cashFlowTrend,
      },
    };
  }

  private async getCategoryBreakdown(userId: string, start: Date, end: Date) {
    const expenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lte: end },
      },
    });

    const categories: Record<string, number> = {};
    for (const exp of expenses) {
      categories[exp.category] = (categories[exp.category] || 0) + exp.amount;
    }

    return Object.keys(categories).map((name) => ({
      name,
      value: Number(categories[name].toFixed(2)),
    }));
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private async getWeeklyCashFlowTrend(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const investments = await this.prisma.investment.findMany({
      where: { userId },
    });
    const totalInvestments = investments.reduce(
      (sum, inv) => sum + inv.value,
      0,
    );

    const loans = await this.prisma.loan.findMany({
      where: { userId },
    });
    const totalLoans = loans.reduce((sum, loan) => sum + loan.outstanding, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const dailyStats: Record<string, { income: number; expense: number }> = {};
    const endOfDayBalance: Record<string, number> = {};
    let runningBalance = 0;

    for (const tx of transactions) {
      const dateKey = this.toDateKey(new Date(tx.date));

      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { income: 0, expense: 0 };
      }

      if (tx.type === 'INCOME') {
        dailyStats[dateKey].income += tx.amount;
        runningBalance += tx.amount;
      } else {
        dailyStats[dateKey].expense += tx.amount;
        runningBalance -= tx.amount;
      }

      endOfDayBalance[dateKey] = runningBalance;
    }

    let carryBalance = 0;
    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      if (txDate < weekStart) {
        if (tx.type === 'INCOME') {
          carryBalance += tx.amount;
        } else {
          carryBalance -= tx.amount;
        }
      }
    }

    const result: {
      day: string;
      income: number;
      expense: number;
      netWorth: number;
    }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const dateKey = this.toDateKey(day);

      if (endOfDayBalance[dateKey] !== undefined) {
        carryBalance = endOfDayBalance[dateKey];
      }

      const stats = dailyStats[dateKey] || { income: 0, expense: 0 };
      result.push({
        day: day.toLocaleString('default', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        income: Number(stats.income.toFixed(2)),
        expense: Number(stats.expense.toFixed(2)),
        netWorth: Number(
          (carryBalance + totalInvestments - totalLoans).toFixed(2),
        ),
      });
    }

    return result;
  }
}
