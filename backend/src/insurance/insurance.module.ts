import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { InsuranceController } from './insurance.controller.js';

@Module({
  providers: [InsuranceService],
  controllers: [InsuranceController],
  exports: [InsuranceService],
})
export class InsuranceModule {}
