import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard.js';
import { GetUserId } from '../auth/get-user.decorator.js';
import { InsuranceService } from './insurance.service.js';
import { CreateInsuranceDto, UpdateInsuranceDto } from './dto/insurance.dto.js';

@Controller('insurance')
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private insService: InsuranceService) {}

  @Post()
  create(@GetUserId() userId: string, @Body() dto: CreateInsuranceDto) {
    return this.insService.create(userId, dto);
  }

  @Get()
  findAll(@GetUserId() userId: string) {
    return this.insService.findAll(userId);
  }

  @Get(':id')
  findOne(@GetUserId() userId: string, @Param('id') id: string) {
    return this.insService.findOne(userId, id);
  }

  @Put(':id')
  update(
    @GetUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInsuranceDto,
  ) {
    return this.insService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@GetUserId() userId: string, @Param('id') id: string) {
    return this.insService.remove(userId, id);
  }
}
