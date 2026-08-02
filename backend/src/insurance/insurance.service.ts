import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildCsv } from '../common/csv.util.js';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto.js';

@Injectable()
export class InsuranceService {
  constructor(private prisma: PrismaService) {}

  async exportCsv(userId: string) {
    const policies = await this.prisma.insurance.findMany({
      where: { userId },
      orderBy: { renewalDate: 'asc' },
    });

    const headers = [
      'Policy Name',
      'Policy Number',
      'Type',
      'Premium',
      'Premium Frequency',
      'Coverage',
      'Renewal Date',
      'Nominee',
      'Status',
    ];

    const rows = policies.map((p) => [
      p.policyName,
      p.policyNumber,
      p.type,
      p.premium,
      p.premiumFrequency,
      p.coverage,
      p.renewalDate,
      p.nominee,
      p.status,
    ]);

    return buildCsv(headers, rows);
  }

  async create(userId: string, dto: CreateInsuranceDto) {
    return this.prisma.insurance.create({
      data: {
        userId,
        policyName: dto.policyName,
        policyNumber: dto.policyNumber,
        type: dto.type,
        premium: dto.premium,
        premiumFrequency: dto.premiumFrequency,
        renewalDate: new Date(dto.renewalDate),
        nominee: dto.nominee,
        coverage: dto.coverage,
        status: dto.status,
      },
    });
  }

  async findAll(userId: string) {
    const policies = await this.prisma.insurance.findMany({
      where: { userId },
      orderBy: { renewalDate: 'asc' },
    });

    // Check expiration dynamically and update status
    const now = new Date();
    const updatedPolicies = await Promise.all(
      policies.map(async (p) => {
        if (p.status === 'ACTIVE' && p.renewalDate < now) {
          const updated = await this.prisma.insurance.update({
            where: { id: p.id },
            data: { status: 'EXPIRED' },
          });
          return updated;
        }
        return p;
      }),
    );

    return updatedPolicies;
  }

  async findOne(userId: string, id: string) {
    const policy = await this.prisma.insurance.findFirst({
      where: { id, userId },
    });
    if (!policy) {
      throw new NotFoundException('Insurance policy not found');
    }
    return policy;
  }

  async update(userId: string, id: string, dto: UpdateInsuranceDto) {
    await this.findOne(userId, id);

    return this.prisma.insurance.update({
      where: { id },
      data: {
        ...dto,
        renewalDate: dto.renewalDate ? new Date(dto.renewalDate) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.insurance.delete({
      where: { id },
    });
    return { success: true };
  }
}
