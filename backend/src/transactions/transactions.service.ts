import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto, UpdateTransactionDto, ImportTransactionsDto } from './dto/transaction.dto.js';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    // Duplicate check
    const isDup = await this.detectDuplicate(userId, new Date(dto.date), dto.amount, dto.description);
    if (isDup) {
      throw new BadRequestException('Potential duplicate transaction detected');
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        date: new Date(dto.date),
        description: dto.description,
        category: dto.category,
        subCategory: dto.subCategory,
        amount: dto.amount,
        type: dto.type,
        paymentMode: dto.paymentMode,
        account: dto.account,
        tags: dto.tags || [],
        notes: dto.notes,
        recurring: dto.recurring || false,
        attachments: dto.attachments || [],
      },
    });
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
    },
  ) {
    const where: any = { userId };

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
      where.account = filters.account;
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.date.lte = new Date(filters.endDate);
      }
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      where.date = {
        gte: firstDay,
        lte: lastDay,
      };
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
    });
    if (!tx) {
      throw new NotFoundException('Transaction not found');
    }
    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.findOne(userId, id);

    return this.prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.transaction.delete({
      where: { id },
    });
    return { success: true };
  }

  async import(userId: string, dto: ImportTransactionsDto) {
    const transactionsToInsert: any[] = [];
    let duplicatesSkipped = 0;

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

        const isDup = await this.detectDuplicate(userId, date, amount, description);
        if (isDup) {
          duplicatesSkipped++;
          continue;
        }

        transactionsToInsert.push({
          userId,
          date,
          description,
          category,
          amount,
          type,
          paymentMode,
          account,
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
        const sentRegex = /(?:sent|debited|paid)\s+(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+to\s+([^on]+)(?:\s+on\s+([^.]+))?/i;
        // Try general debit style: "Rs.X debited from Y AC Z to W"
        const debitGeneralRegex = /(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+debited\s+from\s+([^\s]+)\s+.*?to\s+([^Ref]+)/i;

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
            const creditRegex = /(?:rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s+(?:credited|received)\s+to\s+([^\s]+)/i;
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

        const isDup = await this.detectDuplicate(userId, new Date(), amount, merchant);
        if (isDup) {
          duplicatesSkipped++;
          continue;
        }

        transactionsToInsert.push({
          userId,
          date: new Date(),
          description: merchant,
          category: catInfo.category,
          subCategory: catInfo.subCategory,
          amount,
          type: isExpense ? 'EXPENSE' : 'INCOME',
          paymentMode: 'UPI',
          account,
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

  private async detectDuplicate(userId: string, date: Date, amount: number, description: string): Promise<boolean> {
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

  private autoCategorize(description: string): { category: string; subCategory?: string } {
    const desc = description.toLowerCase();
    if (desc.includes('dmart') || desc.includes('grocery') || desc.includes('groceries') || desc.includes('bigbasket') || desc.includes('blinkit') || desc.includes('zepto')) {
      return { category: 'Groceries' };
    }
    if (desc.includes('shell') || desc.includes('petrol') || desc.includes('fuel') || desc.includes('cng') || desc.includes('hpcl') || desc.includes('bpcl') || desc.includes('iocl')) {
      return { category: 'Fuel' };
    }
    if (desc.includes('rent') || desc.includes('apartment') || desc.includes('maintenance')) {
      return { category: 'Rent', subCategory: 'House' };
    }
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('restaurant') || desc.includes('food') || desc.includes('cafe') || desc.includes('starbucks')) {
      return { category: 'Food', subCategory: 'Restaurant' };
    }
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('myntra') || desc.includes('shopping')) {
      return { category: 'Shopping', subCategory: 'Amazon' };
    }
    if (desc.includes('tcs') || desc.includes('infosys') || desc.includes('salary') || desc.includes('paycheck')) {
      return { category: 'Salary' };
    }
    if (desc.includes('electricity') || desc.includes('power') || desc.includes('bescom') || desc.includes('mseb')) {
      return { category: 'Utilities', subCategory: 'Electricity' };
    }
    if (desc.includes('act fibernet') || desc.includes('broadband') || desc.includes('internet') || desc.includes('wifi')) {
      return { category: 'Utilities', subCategory: 'Internet' };
    }
    if (desc.includes('jio') || desc.includes('airtel') || desc.includes('vodafone') || desc.includes('mobile')) {
      return { category: 'Utilities', subCategory: 'Mobile' };
    }
    if (desc.includes('netflix') || desc.includes('prime video') || desc.includes('theatre') || desc.includes('cinema') || desc.includes('entertainment')) {
      return { category: 'Entertainment' };
    }
    if (desc.includes('hdfc click') || desc.includes('insurance') || desc.includes('lic') || desc.includes('bupa') || desc.includes('lombard')) {
      return { category: 'Insurance' };
    }
    if (desc.includes('loan') || desc.includes('emi') || desc.includes('lender')) {
      return { category: 'Loan' };
    }
    if (desc.includes('mutual fund') || desc.includes('sip') || desc.includes('nps') || desc.includes('ppf') || desc.includes('stock') || desc.includes('groww') || desc.includes('zerodha')) {
      return { category: 'Investment' };
    }
    if (desc.includes('cashback') || desc.includes('refund') || desc.includes('interest')) {
      return { category: 'Income', subCategory: 'Cashback' };
    }
    return { category: 'Misc' };
  }
}
