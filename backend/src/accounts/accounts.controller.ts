import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { AccountsService } from './accounts.service.js';
import { UpdateAccountDto } from './dto/account.dto.js';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.accountsService.findAll(userId);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(userId, id, dto);
  }
}
