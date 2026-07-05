import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto.js';
import { Investment } from '../../generated/prisma/client';

@Injectable()
export class InvestmentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateInvestmentDto) {
    const profit = dto.value - dto.principal;

    return this.prisma.investment.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        principal: dto.principal,
        units: dto.units,
        navOrPrice: dto.navOrPrice,
        purchaseDate: new Date(dto.purchaseDate),
        value: dto.value,
        profit,
        goalId: dto.goalId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.investment.findMany({
      where: { userId },
      include: { goal: true },
      orderBy: { purchaseDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const inv = await this.prisma.investment.findFirst({
      where: { id, userId },
      include: { goal: true },
    });
    if (!inv) {
      throw new NotFoundException('Investment not found');
    }
    return inv;
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    const inv = await this.findOne(userId, id);

    const principal = dto.principal !== undefined ? dto.principal : inv.principal;
    const value = dto.value !== undefined ? dto.value : inv.value;
    const profit = value - principal;

    return this.prisma.investment.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        profit,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.investment.delete({
      where: { id },
    });
    return { success: true };
  }

  async getPortfolioSummary(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
    });

    if (investments.length === 0) {
      return {
        totalInvested: 0,
        totalValue: 0,
        totalProfit: 0,
        profitPercentage: 0,
        portfolioXirr: 0,
        allocation: [],
        items: [],
      };
    }

    let totalInvested = 0;
    let totalValue = 0;

    const allocationMap: Record<string, number> = {};
    const items = investments.map((inv: Investment) => {
      totalInvested += inv.principal;
      totalValue += inv.value;

      allocationMap[inv.type] = (allocationMap[inv.type] || 0) + inv.value;

      // CAGR calculation
      const days = (new Date().getTime() - inv.purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = days / 365.25;
      let cagr = 0;
      if (years > 0 && inv.principal > 0) {
        cagr = (Math.pow(inv.value / inv.principal, 1 / years) - 1) * 100;
      }

      return {
        ...inv,
        cagr: isFinite(cagr) ? Number(cagr.toFixed(2)) : 0,
      };
    });

    const totalProfit = totalValue - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Build allocation percentage list
    const allocation = Object.keys(allocationMap).map((type) => ({
      type,
      value: allocationMap[type],
      percentage: totalValue > 0 ? Number(((allocationMap[type] / totalValue) * 100).toFixed(2)) : 0,
    }));

    // Calculate Portfolio XIRR
    // Cashflows: Purchases are negative flows. Current value is a single positive flow today.
    const cashflows: { amount: number; date: Date }[] = [];
    for (const inv of investments) {
      cashflows.push({ amount: -inv.principal, date: inv.purchaseDate });
    }
    cashflows.push({ amount: totalValue, date: new Date() });

    const portfolioXirr = this.calculateXIRR(cashflows);

    return {
      totalInvested,
      totalValue,
      totalProfit,
      profitPercentage: Number(profitPercentage.toFixed(2)),
      portfolioXirr: Number(portfolioXirr.toFixed(2)),
      allocation,
      items,
    };
  }

  private calculateXIRR(payments: { amount: number; date: Date }[]): number {
    if (payments.length < 2) return 0;

    const sorted = [...payments].sort((a, b) => a.date.getTime() - b.date.getTime());
    const d0 = sorted[0].date;

    const f = (r: number) => {
      let sum = 0;
      for (const p of sorted) {
        const t = (p.date.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        sum += p.amount / Math.pow(1 + r, t);
      }
      return sum;
    };

    const df = (r: number) => {
      let sum = 0;
      for (const p of sorted) {
        const t = (p.date.getTime() - d0.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        sum += -t * p.amount / Math.pow(1 + r, t + 1);
      }
      return sum;
    };

    let r = 0.1; // initial guess
    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
      const val = f(r);
      const deriv = df(r);
      if (Math.abs(deriv) < 1e-12) break;
      const nextR = r - val / deriv;
      if (Math.abs(nextR - r) < tolerance) {
        return nextR * 100;
      }
      r = nextR;
    }

    // Fallback bisection
    let low = -0.99;
    let high = 10.0;
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const fMid = f(mid);
      if (Math.abs(fMid) < tolerance) {
        return mid * 100;
      }
      const fLow = f(low);
      if (fMid * fLow < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return r * 100;
  }
}
