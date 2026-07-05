import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(userId: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Get all accounts for user and sum opening balances
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    });
    const totalOpeningBalance = accounts.reduce((sum, acc) => sum + acc.openingBalance, 0);

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
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.value, 0);

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
      ? emergencyGoal.currentAmount + emergencyGoal.investments.reduce((sum, inv) => sum + inv.value, 0)
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
    const averageMonthlyExpenses = monthlyExpenses > 0 ? monthlyExpenses : 50000;
    const fiTarget = averageMonthlyExpenses * 300;
    const fiProgressPct = fiTarget > 0 ? (totalInvestments / fiTarget) * 100 : 0;

    // 8. Trends & Charts
    const expenseTrend = await this.getCategoryBreakdown(userId, currentMonthStart, currentMonthEnd);
    const cashFlowTrend = await this.getMonthlyCashFlowTrend(userId);

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

  private async getMonthlyCashFlowTrend(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });

    const monthlyData: Record<string, { income: number; expense: number; netWorthEstimate: number }> = {};
    let cumulativeBalance = 0;

    // Estimate cumulative investments over time
    const investments = await this.prisma.investment.findMany({
      where: { userId },
    });
    const totalInvestments = investments.reduce((sum, inv) => sum + inv.value, 0);

    // Estimate cumulative loans over time
    const loans = await this.prisma.loan.findMany({
      where: { userId },
    });
    const totalLoans = loans.reduce((sum, loan) => sum + loan.outstanding, 0);

    for (const tx of transactions) {
      const txDate = new Date(tx.date);
      const monthKey = txDate.toLocaleString('default', { month: 'short', year: '2-digit' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0, netWorthEstimate: 0 };
      }

      if (tx.type === 'INCOME') {
        monthlyData[monthKey].income += tx.amount;
        cumulativeBalance += tx.amount;
      } else {
        monthlyData[monthKey].expense += tx.amount;
        cumulativeBalance -= tx.amount;
      }

      // Estimate net worth at each step
      monthlyData[monthKey].netWorthEstimate = cumulativeBalance + totalInvestments - totalLoans;
    }

    return Object.keys(monthlyData).map((month) => ({
      month,
      income: Number(monthlyData[month].income.toFixed(2)),
      expense: Number(monthlyData[month].expense.toFixed(2)),
      netWorth: Number(monthlyData[month].netWorthEstimate.toFixed(2)),
    }));
  }
}
