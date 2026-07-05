import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsService } from './budgets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('BudgetsService', () => {
  let service: BudgetsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    budget: {
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 'test-id', ...dto.data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a budget', async () => {
    const dto = {
      type: 'MONTHLY',
      category: 'Fuel',
      amount: 5000,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    };

    const result = await service.create('user-id', dto);
    expect(result).toBeDefined();
    expect(result.category).toBe('Fuel');
    expect(result.amount).toBe(5000);
    expect(prisma.budget.create).toHaveBeenCalled();
  });
});
