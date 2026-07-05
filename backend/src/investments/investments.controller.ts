import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { InvestmentsService } from './investments.service.js';
import { CreateInvestmentDto, UpdateInvestmentDto } from './dto/investment.dto.js';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private invService: InvestmentsService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() dto: CreateInvestmentDto) {
    return this.invService.create(userId, dto);
  }

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.invService.findAll(userId);
  }

  @Get('summary')
  getSummary(@GetUserId() userId: string) {
    return this.invService.getPortfolioSummary(userId);
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id') id: string) {
    return this.invService.findOne(userId, id);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    return this.invService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id') id: string) {
    return this.invService.remove(userId, id);
  }
}
