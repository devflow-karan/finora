import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto.js';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.financialGoal.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        targetAmount: dto.targetAmount,
        currentAmount: dto.currentAmount,
        expectedDate: new Date(dto.expectedDate),
      },
    });
  }

  async findAll(userId: string) {
    const goals = await this.prisma.financialGoal.findMany({
      where: { userId },
      include: { investments: true },
      orderBy: { expectedDate: 'asc' },
    });

    return goals.map((goal) => {
      // Sum value of all investments mapped to this goal
      const investmentValue = goal.investments.reduce((sum, inv) => sum + inv.value, 0);
      const totalAccumulated = goal.currentAmount + investmentValue;
      const progressPct = goal.targetAmount > 0 ? (totalAccumulated / goal.targetAmount) * 100 : 0;

      return {
        ...goal,
        totalAccumulated,
        progressPercentage: Number(Math.min(100, progressPct).toFixed(2)),
        remainingAmount: Math.max(0, goal.targetAmount - totalAccumulated),
      };
    });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id, userId },
      include: { investments: true },
    });
    if (!goal) {
      throw new NotFoundException('Financial goal not found');
    }

    const investmentValue = goal.investments.reduce((sum, inv) => sum + inv.value, 0);
    const totalAccumulated = goal.currentAmount + investmentValue;
    const progressPct = goal.targetAmount > 0 ? (totalAccumulated / goal.targetAmount) * 100 : 0;

    return {
      ...goal,
      totalAccumulated,
      progressPercentage: Number(Math.min(100, progressPct).toFixed(2)),
      remainingAmount: Math.max(0, goal.targetAmount - totalAccumulated),
    };
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    await this.findOne(userId, id);

    return this.prisma.financialGoal.update({
      where: { id },
      data: {
        ...dto,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.financialGoal.delete({
      where: { id },
    });
    return { success: true };
  }
}
