import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { TransactionsService } from './transactions.service.js';
import { CreateTransactionDto, UpdateTransactionDto, ImportTransactionsDto } from './dto/transaction.dto.js';

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
  ) {
    return this.txService.findAll(userId, { search, category, account, type, startDate, endDate });
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
