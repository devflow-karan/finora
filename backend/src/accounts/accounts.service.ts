import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateAccountDto } from './dto/account.dto.js';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          select: {
            amount: true,
            type: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return accounts.map((acc) => {
      const txBalance = acc.transactions.reduce((sum, tx) => {
        return tx.type === 'INCOME' ? sum + tx.amount : sum - tx.amount;
      }, 0);
      const { transactions, ...accountData } = acc;
      return {
        ...accountData,
        currentBalance: acc.openingBalance + txBalance,
      };
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        name: dto.name,
        openingBalance: dto.openingBalance,
      },
    });
  }
}
