import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { BudgetsService } from './budgets.service.js';
import { CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto.js';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private budgetsService: BudgetsService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(userId, dto);
  }

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.budgetsService.findAll(userId);
  }

  @Get('performance')
  getPerformance(@GetUserId() userId: string, @Query('date') date?: string) {
    return this.budgetsService.getBudgetPerformance(userId, date);
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id') id: string) {
    return this.budgetsService.findOne(userId, id);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id') id: string) {
    return this.budgetsService.remove(userId, id);
  }
}
