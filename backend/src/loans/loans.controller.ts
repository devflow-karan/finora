import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { LoansService } from './loans.service.js';
import {
  CreateLoanDto,
  UpdateLoanDto,
  CreateExtraPaymentDto,
} from './dto/loan.dto.js';

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoansController {
  constructor(private loansService: LoansService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() dto: CreateLoanDto) {
    return this.loansService.create(userId, dto);
  }

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.loansService.findAll(userId);
  }

  @Get('export')
  async export(
    @GetUserId() userId: string,
    @Res({ passthrough: true }) res: express.Response,
  ) {
    const csv = await this.loansService.exportCsv(userId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=loans.csv',
    );
    return csv;
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id') id: string) {
    return this.loansService.findOne(userId, id);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLoanDto,
  ) {
    return this.loansService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id') id: string) {
    return this.loansService.remove(userId, id);
  }

  @Post(':id/extra-payment')
  addExtraPayment(
    @GetUserId() userId: string,
    @Param('id') loanId: string,
    @Body() dto: CreateExtraPaymentDto,
  ) {
    return this.loansService.addExtraPayment(userId, loanId, dto);
  }

  @Get(':id/amortization')
  getAmortization(@GetUserId() userId: string, @Param('id') id: string) {
    return this.loansService.getAmortizationSchedule(userId, id);
  }
}
