import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InvestmentsService } from '../investments/investments.service.js';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  ImportTransactionsDto,
} from './dto/transaction.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private investmentsService: InvestmentsService,
  ) {}

  async create(userId: string, dto: CreateTransactionDto) {
    // Duplicate check
    const isDup = await this.detectDuplicate(
      userId,
      new Date(dto.date),
      dto.amount,
      dto.description,
    );
    if (isDup) {
      throw new BadRequestException('Potential duplicate transaction detected');
    }

    const accountId = await this.resolveAccountId(userId, dto.account);

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId,
          date: new Date(dto.date),
          description: dto.description,
          category: dto.category,
          subCategory: dto.subCategory,
          amount: dto.amount,
          type: dto.type,
          paymentMode: dto.paymentMode,
          tags: dto.tags || [],
          notes: dto.notes,
          recurring: dto.recurring || false,
          attachments: dto.attachments || [],
          investmentId: dto.investmentId,
        },
      });

      if (dto.investmentId && dto.type === 'EXPENSE') {
        await this.investmentsService.applyContribution(
          userId,
          dto.investmentId,
          dto.amount,
          tx,
        );
      }

      return transaction;
    });
  }

  private parseStartOfDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private parseEndOfDay(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  async findAll(
    userId: string,
    filters: {
      search?: string;
      category?: string;
      account?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.account) {
      where.account = { name: filters.account };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters.startDate) {
        dateFilter.gte = this.parseStartOfDay(filters.startDate);
      }
      if (filters.endDate) {
        dateFilter.lte = this.parseEndOfDay(filters.endDate);
      }
      where.date = dateFilter;
    } else {
      const now = new Date();
      const firstDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
        0,
        0,
        0,
        0,
      );
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      where.date = {
        gte: firstDay,
        lte: lastDay,
      };
    }

    const page =
      Number.isFinite(filters.page) && filters.page! > 0 ? filters.page! : 1;
    const limit = Number.isFinite(filters.limit)
      ? Math.min(100, Math.max(1, filters.limit!))
      : 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { account: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map(({ account, ...tx }) => ({
        ...tx,
        account: account?.name,
      })),
      total,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 1,
    };
  }

  async exportCsv(
    userId: string,
    filters: {
      search?: string;
      category?: string;
      account?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.search) {
      where.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { notes: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.account) {
      where.account = { name: filters.account };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filters.startDate) {
        dateFilter.gte = this.parseStartOfDay(filters.startDate);
      }
      if (filters.endDate) {
        dateFilter.lte = this.parseEndOfDay(filters.endDate);
      }
      where.date = dateFilter;
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        account: { select: { name: true } },
        investment: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const headers = [
      'Date',
      'Description',
      'Category',
      'Sub-Category',
      'Amount',
      'Type',
      'Payment Mode',
      'Account Name',
      'Investment Name',
      'Tags',
      'Notes',
      'Recurring',
      'Attachments',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = '';
      if (val instanceof Date) {
        str = val.toISOString();
      } else {
        str = String(val);
      }
      const escaped = str.replace(/"/g, '""');
      if (
        escaped.includes(',') ||
        escaped.includes('"') ||
        escaped.includes('\n') ||
        escaped.includes('\r')
      ) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const csvLines = [headers.join(',')];

    for (const tx of transactions) {
      const row = [
        tx.date,
        tx.description,
        tx.category,
        tx.subCategory || '',
        tx.amount,
        tx.type,
        tx.paymentMode,
        tx.account?.name || '',
        tx.investment?.name || '',
        tx.tags.join(', '),
        tx.notes || '',
        tx.recurring,
        tx.attachments.join(', '),
      ];
      csvLines.push(row.map(escapeCsv).join(','));
    }

    return csvLines.join('\r\n');
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: { select: { name: true } } },
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    const { account, ...rest } = tx;
    return { ...rest, account: account?.name };
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOne(userId, id);
    const accountId =
      dto.account !== undefined
        ? await this.resolveAccountId(userId, dto.account)
        : undefined;

    return this.prisma.$transaction(async (tx) => {
      // Reverse the old contribution (if any) before applying the new one, so
      // amount changes, re-linking, and un-linking all keep the investment in sync.
      if (existing.investmentId && existing.type === 'EXPENSE') {
        await this.investmentsService.applyContribution(
          userId,
          existing.investmentId,
          -existing.amount,
          tx,
        );
      }

      const updated = await tx.transaction.update({
        where: { id },
        data: {
          date: dto.date ? new Date(dto.date) : undefined,
          description: dto.description,
          category: dto.category,
          subCategory: dto.subCategory,
          amount: dto.amount,
          type: dto.type,
          paymentMode: dto.paymentMode,
          accountId,
          tags: dto.tags,
          notes: dto.notes,
          recurring: dto.recurring,
          attachments: dto.attachments,
          investmentId:
            dto.investmentId !== undefined ? dto.investmentId : undefined,
        },
      });

      const newInvestmentId =
        dto.investmentId !== undefined
          ? dto.investmentId
          : existing.investmentId;
      const newType = dto.type ?? existing.type;
      const newAmount = dto.amount ?? existing.amount;
      if (newInvestmentId && newType === 'EXPENSE') {
        await this.investmentsService.applyContribution(
          userId,
          newInvestmentId,
          newAmount,
          tx,
        );
      }

      return updated;
    });
  }

  private async resolveAccountId(
    userId: string,
    name?: string,
  ): Promise<string> {
    const accountName = name?.trim() || 'Primary Account';
    let account = await this.prisma.account.findFirst({
      where: { userId, name: accountName },
    });
    if (!account) {
      account = await this.prisma.account.create({
        data: { userId, name: accountName },
      });
    }
    return account.id;
  }

  async remove(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      if (existing.investmentId && existing.type === 'EXPENSE') {
        await this.investmentsService.applyContribution(
          userId,
          existing.investmentId,
          -existing.amount,
          tx,
        );
      }

      await tx.transaction.delete({
        where: { id },
      });

      return { success: true };
    });
  }

  async import(userId: string, dto: ImportTransactionsDto) {
    const transactionsToInsert: any[] = [];
    let duplicatesSkipped = 0;
    const accountIdByName = new Map<string, string>();
    const resolveCachedAccountId = async (name: string): Promise<string> => {
      if (!accountIdByName.has(name)) {
        accountIdByName.set(name, await this.resolveAccountId(userId, name));
      }
      return accountIdByName.get(name)!;
    };

    if (dto.format === 'CSV') {
      // Split lines and parse CSV
      const lines = dto.rawData.split('\n');
      // Headers expected: date,description,category,amount,type,paymentMode,account
      // Simple parser (doesn't handle quotes with commas, but sufficient for standard finance exports)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length < 5) continue;

        const date = new Date(parts[0].trim());
        const description = parts[1].trim();
        let category = parts[2]?.trim();
        const amount = parseFloat(parts[3].trim());
        const type = parts[4].trim().toUpperCase(); // INCOME / EXPENSE
        const paymentMode = parts[5]?.trim() || 'UPI';
        const account = parts[6]?.trim() || 'Default Account';

        if (isNaN(amount)) continue;

        if (!category) {
          const catInfo = this.autoCategorize(description);
          category = catInfo.category;
        }

        const isDup = await this.detectDuplicate(
          userId,
          date,
          amount,
          description,
        );
        if (isDup) {
          duplicatesSkipped++;
          continue;
        }

        const accountId = await resolveCachedAccountId(account);

        transactionsToInsert.push({
          userId,
          date,
          description,
          category,
          amount,
          type,
          paymentMode,
          accountId,
          tags: [],
          attachments: [],
        });
      }
    } else if (dto.format === 'UPI_SMS') {
      // Parse UPI message strings
      // Ex: "Sent Rs.500 to Swiggy on ICICI Bank AC XXXXX. Ref 123456"
      // Ex: "Rs.1500 debited from HDFC AC 1234 to DMart Ref 998877"
      const lines = dto.rawData.split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        let amount = 0;
        let merchant = 'UPI Transfer';
        let account = 'Bank Account';
        let isExpense = true;

        // Try ICICI style: "Sent Rs.X to Y on Z. Ref W"
        const sentRegex =
          /(?:sent|debited|paid)\s+(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+to\s+([^on]+)(?:\s+on\s+([^.]+))?/i;
        // Try general debit style: "Rs.X debited from Y AC Z to W"
        const debitGeneralRegex =
          /(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+debited\s+from\s+([^\s]+)\s+.*?to\s+([^Ref]+)/i;

        let match = line.match(sentRegex);
        if (match) {
          amount = parseFloat(match[1].replace(/,/g, ''));
          merchant = match[2].trim();
          account = match[3] ? match[3].trim() : 'UPI App';
        } else {
          match = line.match(debitGeneralRegex);
          if (match) {
            amount = parseFloat(match[1].replace(/,/g, ''));
            account = match[2].trim();
            merchant = match[3].trim();
          } else {
            // General matching for "credited" to detect Income
            const creditRegex =
              /(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+(?:credited|received)\s+to\s+([^\s]+)/i;
            const creditMatch = line.match(creditRegex);
            if (creditMatch) {
              amount = parseFloat(creditMatch[1].replace(/,/g, ''));
              account = creditMatch[2].trim();
              merchant = 'UPI Inward Credit';
              isExpense = false;
            } else {
              continue; // Skip unrecognized text
            }
          }
        }

        const catInfo = this.autoCategorize(merchant);

        const isDup = await this.detectDuplicate(
          userId,
          new Date(),
          amount,
          merchant,
        );
        if (isDup) {
          duplicatesSkipped++;
          continue;
        }

        const accountId = await resolveCachedAccountId(account);

        transactionsToInsert.push({
          userId,
          date: new Date(),
          description: merchant,
          category: catInfo.category,
          subCategory: catInfo.subCategory,
          amount,
          type: isExpense ? 'EXPENSE' : 'INCOME',
          paymentMode: 'UPI',
          accountId,
          tags: ['upi-import'],
          attachments: [],
        });
      }
    }

    if (transactionsToInsert.length > 0) {
      await this.prisma.transaction.createMany({
        data: transactionsToInsert,
      });
    }

    return {
      importedCount: transactionsToInsert.length,
      duplicatesSkipped,
    };
  }

  private async detectDuplicate(
    userId: string,
    date: Date,
    amount: number,
    description: string,
  ): Promise<boolean> {
    const oneDayAgo = new Date(date.getTime() - 24 * 60 * 60 * 1000);
    const oneDayLater = new Date(date.getTime() + 24 * 60 * 60 * 1000);

    const existing = await this.prisma.transaction.findFirst({
      where: {
        userId,
        amount,
        date: {
          gte: oneDayAgo,
          lte: oneDayLater,
        },
        description: {
          contains: description.substring(0, 10),
          mode: 'insensitive',
        },
      },
    });

    return !!existing;
  }

  private autoCategorize(description: string): {
    category: string;
    subCategory?: string;
  } {
    const desc = description.toLowerCase();
    if (
      desc.includes('dmart') ||
      desc.includes('grocery') ||
      desc.includes('groceries') ||
      desc.includes('bigbasket') ||
      desc.includes('blinkit') ||
      desc.includes('zepto')
    ) {
      return { category: 'Groceries' };
    }
    if (
      desc.includes('shell') ||
      desc.includes('petrol') ||
      desc.includes('fuel') ||
      desc.includes('cng') ||
      desc.includes('hpcl') ||
      desc.includes('bpcl') ||
      desc.includes('iocl')
    ) {
      return { category: 'Fuel' };
    }
    if (
      desc.includes('rent') ||
      desc.includes('apartment') ||
      desc.includes('maintenance')
    ) {
      return { category: 'Rent', subCategory: 'House' };
    }
    if (
      desc.includes('swiggy') ||
      desc.includes('zomato') ||
      desc.includes('restaurant') ||
      desc.includes('food') ||
      desc.includes('cafe') ||
      desc.includes('starbucks')
    ) {
      return { category: 'Food', subCategory: 'Restaurant' };
    }
    if (
      desc.includes('amazon') ||
      desc.includes('flipkart') ||
      desc.includes('myntra') ||
      desc.includes('shopping')
    ) {
      return { category: 'Shopping', subCategory: 'Amazon' };
    }
    if (
      desc.includes('tcs') ||
      desc.includes('infosys') ||
      desc.includes('salary') ||
      desc.includes('paycheck')
    ) {
      return { category: 'Salary' };
    }
    if (
      desc.includes('electricity') ||
      desc.includes('power') ||
      desc.includes('bescom') ||
      desc.includes('mseb')
    ) {
      return { category: 'Utilities', subCategory: 'Electricity' };
    }
    if (
      desc.includes('act fibernet') ||
      desc.includes('broadband') ||
      desc.includes('internet') ||
      desc.includes('wifi')
    ) {
      return { category: 'Utilities', subCategory: 'Internet' };
    }
    if (
      desc.includes('jio') ||
      desc.includes('airtel') ||
      desc.includes('vodafone') ||
      desc.includes('mobile')
    ) {
      return { category: 'Utilities', subCategory: 'Mobile' };
    }
    if (
      desc.includes('netflix') ||
      desc.includes('prime video') ||
      desc.includes('theatre') ||
      desc.includes('cinema') ||
      desc.includes('entertainment')
    ) {
      return { category: 'Entertainment' };
    }
    if (
      desc.includes('hdfc click') ||
      desc.includes('insurance') ||
      desc.includes('lic') ||
      desc.includes('bupa') ||
      desc.includes('lombard')
    ) {
      return { category: 'Insurance' };
    }
    if (
      desc.includes('loan') ||
      desc.includes('emi') ||
      desc.includes('lender')
    ) {
      return { category: 'Loan' };
    }
    if (
      desc.includes('mutual fund') ||
      desc.includes('sip') ||
      desc.includes('nps') ||
      desc.includes('ppf') ||
      desc.includes('stock') ||
      desc.includes('groww') ||
      desc.includes('zerodha')
    ) {
      return { category: 'Investment' };
    }
    if (
      desc.includes('cashback') ||
      desc.includes('refund') ||
      desc.includes('interest')
    ) {
      return { category: 'Income', subCategory: 'Cashback' };
    }
    return { category: 'Misc' };
  }
}
