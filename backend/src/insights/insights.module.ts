import { Module } from '@nestjs/common';
import { InsightsService } from './insights.service.js';
import { InsightsController } from './insights.controller.js';

@Module({
  providers: [InsightsService],
  controllers: [InsightsController],
  exports: [InsightsService],
})
export class InsightsModule {}
