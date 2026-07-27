import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto.js';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto) {
    return this.prisma.budget.create({
      data: {
        userId,
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        carryForward: dto.carryForward || false,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
    });
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }
    return budget;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);

    return this.prisma.budget.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.budget.delete({
      where: { id },
    });
    return { success: true };
  }

  async getBudgetPerformance(userId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      1,
    );
    const endOfMonth = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Fetch budgets active in this month
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: endOfMonth },
        endDate: { gte: startOfMonth },
      },
    });

    // Fetch all expenses in this month
    const expenses = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Group actual expenses by category
    const categoryExpenses: Record<string, number> = {};
    for (const exp of expenses) {
      categoryExpenses[exp.category] =
        (categoryExpenses[exp.category] || 0) + exp.amount;
    }

    // Build comparison list
    const report = budgets.map((b) => {
      const actual = categoryExpenses[b.category] || 0;
      const difference = b.amount - actual;
      const pct = b.amount > 0 ? (actual / b.amount) * 100 : 0;

      return {
        id: b.id,
        category: b.category,
        budgeted: b.amount,
        actual,
        remaining: difference,
        percentageUsed: pct,
        isOverSpent: actual > b.amount,
        startDate: b.startDate,
        endDate: b.endDate,
      };
    });

    return report;
  }
}
