import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { InsightsService } from './insights.service.js';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get('health')
  getHealthScore(@GetUserId() userId: string) {
    return this.insightsService.getHealthScore(userId);
  }

  @Get()
  getInsights(@GetUserId() userId: string) {
    return this.insightsService.getInsights(userId);
  }
}
