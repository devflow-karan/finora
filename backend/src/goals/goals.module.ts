import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service.js';
import { GoalsController } from './goals.controller.js';

@Module({
  providers: [GoalsService],
  controllers: [GoalsController],
  exports: [GoalsService],
})
export class GoalsModule {}
