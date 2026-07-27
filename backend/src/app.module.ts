import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { BudgetsModule } from './budgets/budgets.module.js';
import { LoansModule } from './loans/loans.module.js';
import { InvestmentsModule } from './investments/investments.module.js';
import { InsuranceModule } from './insurance/insurance.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { AccountsModule } from './accounts/accounts.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TransactionsModule,
    BudgetsModule,
    LoansModule,
    InvestmentsModule,
    InsuranceModule,
    GoalsModule,
    DashboardModule,
    InsightsModule,
    AccountsModule,
  ],
})
export class AppModule {}
