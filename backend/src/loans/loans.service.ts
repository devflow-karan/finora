import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateLoanDto, UpdateLoanDto, CreateExtraPaymentDto } from './dto/loan.dto.js';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: {
        userId,
        name: dto.name,
        lender: dto.lender,
        principal: dto.principal,
        interestRate: dto.interestRate,
        interestType: dto.interestType,
        emi: dto.emi,
        outstanding: dto.outstanding,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        type: dto.type,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      include: { extraPayments: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, userId },
      include: { extraPayments: true },
    });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }
    return loan;
  }

  async update(userId: string, id: string, dto: UpdateLoanDto) {
    await this.findOne(userId, id);

    return this.prisma.loan.update({
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
    await this.prisma.loan.delete({
      where: { id },
    });
    return { success: true };
  }

  async addExtraPayment(userId: string, loanId: string, dto: CreateExtraPaymentDto) {
    const loan = await this.findOne(userId, loanId);

    // Create payment
    const payment = await this.prisma.extraPayment.create({
      data: {
        loanId,
        date: new Date(dto.date),
        amount: dto.amount,
        description: dto.description,
      },
    });

    // Update outstanding balance of loan
    const newOutstanding = Math.max(0, loan.outstanding - dto.amount);
    await this.prisma.loan.update({
      where: { id: loanId },
      data: { outstanding: newOutstanding },
    });

    return payment;
  }

  async getAmortizationSchedule(userId: string, loanId: string) {
    const loan = await this.findOne(userId, loanId);

    const scheduleWithExtras = this.calculateSchedule(loan, true);
    const scheduleWithoutExtras = this.calculateSchedule(loan, false);

    const totalInterestWithExtras = scheduleWithExtras.reduce((sum, item) => sum + item.interestPaid, 0);
    const totalInterestWithoutExtras = scheduleWithoutExtras.reduce((sum, item) => sum + item.interestPaid, 0);

    const payoffDateWithExtras = scheduleWithExtras.length > 0 ? scheduleWithExtras[scheduleWithExtras.length - 1].date : loan.endDate;
    const payoffDateWithoutExtras = scheduleWithoutExtras.length > 0 ? scheduleWithoutExtras[scheduleWithoutExtras.length - 1].date : loan.endDate;

    const monthsSaved = Math.max(0, scheduleWithoutExtras.length - scheduleWithExtras.length);
    const interestSaved = Math.max(0, totalInterestWithoutExtras - totalInterestWithExtras);

    return {
      loan,
      metrics: {
        totalInterestWithExtras,
        totalInterestWithoutExtras,
        payoffDateWithExtras,
        payoffDateWithoutExtras,
        monthsSaved,
        interestSaved,
      },
      schedule: scheduleWithExtras,
    };
  }

  private calculateSchedule(loan: any, includeExtra: boolean) {
    const schedule: any[] = [];
    let outstanding = loan.principal; // Start schedule from origin
    const rate = loan.interestRate / 100 / 12;
    const emi = loan.emi;
    const isCompound = loan.interestType === 'COMPOUND';
    const isInterestFree = loan.type === 'INTEREST_FREE';

    let currentDate = new Date(loan.startDate);
    let monthIndex = 1;
    const safetyLimit = 600; // max 50 years

    const extraPaymentsMap: Record<string, number> = {};
    if (includeExtra && loan.extraPayments) {
      for (const ep of loan.extraPayments) {
        const epDate = new Date(ep.date);
        const key = `${epDate.getFullYear()}-${epDate.getMonth()}`;
        extraPaymentsMap[key] = (extraPaymentsMap[key] || 0) + ep.amount;
      }
    }

    while (outstanding > 0 && monthIndex <= safetyLimit) {
      let interest = 0;
      if (!isInterestFree) {
        interest = isCompound ? outstanding * rate : loan.principal * rate;
      }

      // Safeguard if interest is larger than EMI
      if (interest >= emi && !isInterestFree) {
        // Loan will never be paid off with current EMI
        break;
      }

      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
      const extraPayment = extraPaymentsMap[key] || 0;

      const principalPaid = Math.min(emi - interest, outstanding);
      const totalReduction = Math.min(principalPaid + extraPayment, outstanding);

      outstanding -= totalReduction;

      schedule.push({
        month: monthIndex,
        date: new Date(currentDate),
        emiPaid: interest + principalPaid,
        interestPaid: interest,
        principalPaid: principalPaid,
        extraPaid: extraPayment,
        remainingBalance: Math.max(0, outstanding),
      });

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
      monthIndex++;
    }

    return schedule;
  }
}
