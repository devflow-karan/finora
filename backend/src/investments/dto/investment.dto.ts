import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateInvestmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['MUTUAL_FUND', 'STOCK', 'GOLD', 'FD', 'EPF', 'PPF', 'NPS', 'CRYPTO'])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  principal: number;

  @IsNumber()
  @IsOptional()
  units?: number;

  @IsNumber()
  @IsOptional()
  navOrPrice?: number;

  @IsDateString()
  @IsNotEmpty()
  purchaseDate: string;

  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsString()
  @IsOptional()
  goalId?: string;
}

export class UpdateInvestmentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['MUTUAL_FUND', 'STOCK', 'GOLD', 'FD', 'EPF', 'PPF', 'NPS', 'CRYPTO'])
  type?: string;

  @IsNumber()
  @IsOptional()
  principal?: number;

  @IsNumber()
  @IsOptional()
  units?: number;

  @IsNumber()
  @IsOptional()
  navOrPrice?: number;

  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  goalId?: string;
}
