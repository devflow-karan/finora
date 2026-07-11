import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentsService } from './investments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('InvestmentsService', () => {
  let service: InvestmentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    investment: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'test-id', ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvestmentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvestmentsService>(InvestmentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const baseDto = {
      name: 'Parag Parikh Flexi Cap Fund Direct Growth',
      type: 'MUTUAL_FUND',
      principal: 6000,
      purchaseDate: '2024-01-01',
      value: 6100,
    };

    it('defaults isSip to false and sipAmount to null when not provided', async () => {
      const result = await service.create('user-id', baseDto as any);

      expect(result.isSip).toBe(false);
      expect(result.sipAmount).toBeNull();
      expect(prisma.investment.create).toHaveBeenCalled();
    });

    it('stores sipAmount when isSip is true', async () => {
      const result = await service.create('user-id', {
        ...baseDto,
        isSip: true,
        sipAmount: 1500,
      } as any);

      expect(result.isSip).toBe(true);
      expect(result.sipAmount).toBe(1500);
    });

    it('ignores sipAmount when isSip is false', async () => {
      const result = await service.create('user-id', {
        ...baseDto,
        isSip: false,
        sipAmount: 1500,
      } as any);

      expect(result.isSip).toBe(false);
      expect(result.sipAmount).toBeNull();
    });
  });

  describe('getPortfolioSummary', () => {
    it('returns totalMonthlySip as 0 when there are no investments', async () => {
      mockPrismaService.investment.findMany.mockResolvedValueOnce([]);

      const summary = await service.getPortfolioSummary('user-id');
      expect(summary.totalMonthlySip).toBe(0);
      expect(summary.items.data).toEqual([]);
    });

    it('sums sipAmount only across investments where isSip is true', async () => {
      const investments = [
        {
          id: '1',
          type: 'MUTUAL_FUND',
          principal: 6000,
          value: 6100,
          profit: 100,
          purchaseDate: new Date('2024-01-01'),
          isSip: true,
          sipAmount: 1500,
        },
        {
          id: '2',
          type: 'MUTUAL_FUND',
          principal: 8000,
          value: 8239,
          profit: 239,
          purchaseDate: new Date('2024-01-01'),
          isSip: true,
          sipAmount: 1000,
        },
        {
          id: '3',
          type: 'FD',
          principal: 20000,
          value: 21000,
          profit: 1000,
          purchaseDate: new Date('2023-01-01'),
          isSip: false,
          sipAmount: null,
        },
      ];

      mockPrismaService.investment.findMany
        .mockResolvedValueOnce(investments)
        .mockResolvedValueOnce(investments);
      mockPrismaService.investment.count.mockResolvedValueOnce(3);

      const summary = await service.getPortfolioSummary('user-id');
      expect(summary.totalMonthlySip).toBe(2500);
      expect(summary.items.total).toBe(3);
    });

    it('returns a bounded 2-decimal CAGR for same-day investments', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const investments = [
        {
          id: '1',
          type: 'SSY',
          principal: 23,
          value: 32,
          profit: 9,
          purchaseDate: today,
          isSip: false,
          sipAmount: null,
        },
      ];

      mockPrismaService.investment.findMany
        .mockResolvedValueOnce(investments)
        .mockResolvedValueOnce(investments);
      mockPrismaService.investment.count.mockResolvedValueOnce(1);

      const summary = await service.getPortfolioSummary('user-id');
      expect(summary.items.data[0].cagr).toBe(39.13);
    });

    it('filters investments by name, type, and profit status', async () => {
      const investments = [
        {
          id: '1',
          name: 'SBI Bluechip',
          type: 'MUTUAL_FUND',
          principal: 6000,
          value: 6100,
          profit: 100,
          purchaseDate: new Date('2024-01-01'),
          isSip: false,
          sipAmount: null,
        },
        {
          id: '2',
          name: 'HDFC FD',
          type: 'FD',
          principal: 20000,
          value: 19000,
          profit: -1000,
          purchaseDate: new Date('2023-01-01'),
          isSip: false,
          sipAmount: null,
        },
      ];

      mockPrismaService.investment.findMany
        .mockResolvedValueOnce(investments)
        .mockResolvedValueOnce([investments[1]]);
      mockPrismaService.investment.count.mockResolvedValueOnce(1);

      const summary = await service.getPortfolioSummary('user-id', {
        search: 'HDFC',
        type: 'FD',
        profitStatus: 'loss',
      });

      expect(mockPrismaService.investment.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'HDFC', mode: 'insensitive' },
            type: 'FD',
            profit: { lt: 0 },
          }),
        }),
      );
      expect(summary.items.data).toHaveLength(1);
      expect(summary.items.data[0].name).toBe('HDFC FD');
    });
  });
});
