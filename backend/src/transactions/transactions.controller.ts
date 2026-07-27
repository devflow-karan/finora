import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import { JwtAuthGuard } from '../auth/auth.guard.js';

import { GetUserId } from '../auth/get-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  ImportTransactionsDto,
} from './dto/transaction.dto.js';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private txService: TransactionsService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() dto: CreateTransactionDto) {
    return this.txService.create(userId, dto);
  }

  @Get()
  findAll(
    @GetUserId() userId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('account') account?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.txService.findAll(userId, {
      search,
      category,
      account,
      type,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('export')
  async export(
    @GetUserId() userId: string,
    @Res({ passthrough: true }) res: express.Response,
    @Query('search') search?: string,

    @Query('category') category?: string,
    @Query('account') account?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csv = await this.txService.exportCsv(userId, {
      search,
      category,
      account,
      type,
      startDate,
      endDate,
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=transactions.csv',
    );
    return csv;
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id') id: string) {
    return this.txService.findOne(userId, id);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.txService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id') id: string) {
    return this.txService.remove(userId, id);
  }

  @Post('import')
  import(@GetUserId() userId: string, @Body() dto: ImportTransactionsDto) {
    return this.txService.import(userId, dto);
  }
}
