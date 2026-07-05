import { Module } from '@nestjs/common';
import { InvestmentsService } from './investments.service.js';
import { InvestmentsController } from './investments.controller.js';

@Module({
  providers: [InvestmentsService],
  controllers: [InvestmentsController],
  exports: [InvestmentsService],
})
export class InvestmentsModule {}
