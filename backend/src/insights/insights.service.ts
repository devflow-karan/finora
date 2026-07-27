import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getHealthScore(userId: string) {
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

    // 1. Fetch Incomes and Expenses for current month
    const currentTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: currentMonthStart, lte: currentMonthEnd },
      },
    });

    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let monthlyInvestments = 0;

    for (const tx of currentTransactions) {
      if (tx.type === 'INCOME') {
        monthlyIncome += tx.amount;
      } else {
        monthlyExpenses += tx.amount;
        if (tx.category === 'Investment') {
          monthlyInvestments += tx.amount;
        }
      }
    }

    // Heuristics Components:
    // A. Savings Rate (Max 20 pts)
    const savings = monthlyIncome - monthlyExpenses;
    const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
    let savingsRateScore = 0;
    if (savingsRate >= 40) savingsRateScore = 20;
    else if (savingsRate > 0) savingsRateScore = (savingsRate / 40) * 20;

    // B. Debt Ratio (EMI / Income) (Max 20 pts)
    const loans = await this.prisma.loan.findMany({ where: { userId } });
    const totalEmi = loans.reduce((sum, l) => sum + l.emi, 0);
    const debtRatio = monthlyIncome > 0 ? (totalEmi / monthlyIncome) * 100 : 0;
    let debtRatioScore = 20;
    if (debtRatio > 50) debtRatioScore = 0;
    else if (debtRatio > 20) debtRatioScore = 20 - ((debtRatio - 20) / 30) * 20;

    // C. Insurance Coverage (Max 20 pts)
    const insurances = await this.prisma.insurance.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    const hasLife = insurances.some((i) => i.type === 'LIFE');
    const hasHealth = insurances.some((i) => i.type === 'HEALTH');
    let insuranceScore = 0;
    if (hasLife && hasHealth) insuranceScore = 20;
    else if (hasLife || hasHealth) insuranceScore = 10;

    // D. Emergency Fund Coverage (Max 20 pts)
    // Emergency Fund value vs Average Monthly Expenses (use current month or default 50k)
    const averageExpenses = monthlyExpenses > 0 ? monthlyExpenses : 50000;
    const emergencyGoal = await this.prisma.financialGoal.findFirst({
      where: { userId, type: 'EMERGENCY_FUND' },
      include: { investments: true },
    });
    const emergencyFundValue = emergencyGoal
      ? emergencyGoal.currentAmount +
        emergencyGoal.investments.reduce((sum, inv) => sum + inv.value, 0)
      : 0;

    const monthsCovered =
      averageExpenses > 0 ? emergencyFundValue / averageExpenses : 0;
    let emergencyFundScore = 0;
    if (monthsCovered >= 6) emergencyFundScore = 20;
    else if (monthsCovered >= 3)
      emergencyFundScore = 10 + ((monthsCovered - 3) / 3) * 10;
    else if (monthsCovered > 0) emergencyFundScore = (monthsCovered / 3) * 10;

    // E. Investment Ratio (Invested / Income) (Max 20 pts)
    // Calculate actual investments in portfolio plus transactions tagged as Investment
    const investmentsList = await this.prisma.investment.findMany({
      where: { userId },
    });
    const totalInvestments = investmentsList.reduce(
      (sum, inv) => sum + inv.value,
      0,
    );
    const investmentRatio =
      monthlyIncome > 0 ? (monthlyInvestments / monthlyIncome) * 100 : 0;
    let investmentRatioScore = 0;
    if (investmentRatio >= 25) investmentRatioScore = 20;
    else if (investmentRatio > 0)
      investmentRatioScore = (investmentRatio / 25) * 20;

    const totalHealthScore = Math.round(
      savingsRateScore +
        debtRatioScore +
        insuranceScore +
        emergencyFundScore +
        investmentRatioScore,
    );

    return {
      score: totalHealthScore,
      breakdown: {
        savingsRate: {
          score: Math.round(savingsRateScore),
          value: Number(savingsRate.toFixed(1)),
        },
        debtRatio: {
          score: Math.round(debtRatioScore),
          value: Number(debtRatio.toFixed(1)),
        },
        insuranceCoverage: {
          score: Math.round(insuranceScore),
          activePolicies: insurances.length,
        },
        emergencyFund: {
          score: Math.round(emergencyFundScore),
          monthsCovered: Number(monthsCovered.toFixed(1)),
        },
        investmentRatio: {
          score: Math.round(investmentRatioScore),
          value: Number(investmentRatio.toFixed(1)),
        },
      },
    };
  }

  async getInsights(userId: string) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Fetch this month's transactions
    const thisMonthTx = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startOfCurrentMonth } },
    });

    // Fetch last month's transactions
    const lastMonthTx = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startOfLastMonth, lte: endOfLastMonth } },
    });

    const insights: any[] = [];

    // Helper: calculate total expense by category
    const getCategoryTotal = (txList: any[], category: string) => {
      return txList
        .filter(
          (tx) =>
            tx.type === 'EXPENSE' &&
            tx.category.toLowerCase() === category.toLowerCase(),
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
    };

    // Insight 1: Food spend comparison
    const foodThisMonth = getCategoryTotal(thisMonthTx, 'Food');
    const foodLastMonth = getCategoryTotal(lastMonthTx, 'Food');
    if (foodThisMonth > 0 && foodLastMonth > 0) {
      const pctDiff = ((foodThisMonth - foodLastMonth) / foodLastMonth) * 100;
      if (pctDiff > 10) {
        insights.push({
          type: 'WARNING',
          category: 'Food',
          content: `You spent ₹${foodThisMonth.toLocaleString('en-IN')} on Dining/Food this month, which is ${pctDiff.toFixed(1)}% more than last month. Consider cooking at home to save.`,
        });
      }
    }

    // Insight 2: Fuel spend check
    const fuelThisMonth = getCategoryTotal(thisMonthTx, 'Fuel');
    const fuelLastMonth = getCategoryTotal(lastMonthTx, 'Fuel');
    if (fuelThisMonth > fuelLastMonth && fuelLastMonth > 0) {
      const fuelPct = ((fuelThisMonth - fuelLastMonth) / fuelLastMonth) * 100;
      insights.push({
        type: 'INFO',
        category: 'Fuel',
        content: `Fuel spending increased by ${fuelPct.toFixed(1)}% compared to last month. Total spent this month is ₹${fuelThisMonth.toLocaleString('en-IN')}.`,
      });
    }

    // Insight 3: Emergency Fund check
    const healthData = await this.getHealthScore(userId);
    if (healthData.breakdown.emergencyFund.monthsCovered < 3) {
      insights.push({
        type: 'WARNING',
        category: 'Emergency Fund',
        content: `Your Emergency Fund currently covers only ${healthData.breakdown.emergencyFund.monthsCovered} months of average expenses. Financial planners recommend keeping at least 6 months of buffer.`,
      });
    }

    // Insight 4: Extra Loan Payoff suggestion
    const loans = await this.prisma.loan.findMany({
      where: { userId, type: 'INTEREST_BEARING' },
    });
    if (loans.length > 0) {
      const primeLoan = loans[0];
      if (primeLoan.outstanding > 100000 && primeLoan.interestRate > 5) {
        const potentialEmiExtra = 5000;
        insights.push({
          type: 'TIP',
          category: 'Debt',
          content: `You can prepay your ${primeLoan.name} 14 months earlier and save substantial interest by making an extra payment of ₹${potentialEmiExtra.toLocaleString('en-IN')} every month.`,
        });
      }
    }

    // Insight 5: High savings suggest SIP increase
    if (healthData.breakdown.savingsRate.value > 40) {
      insights.push({
        type: 'TIP',
        category: 'Investment',
        content: `Since your savings rate is healthy at ${healthData.breakdown.savingsRate.value}%, you can comfortably increase your monthly SIP mutual fund contributions by 10-15%.`,
      });
    }

    // Fallback if no specific insights generated
    if (insights.length === 0) {
      insights.push({
        type: 'INFO',
        category: 'General',
        content:
          'Your financial habits are looking stable this month. Keep tracking your daily transactions and stick to your category budgets!',
      });
    }

    return insights;
  }
}
