import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, IsEnum, IsBoolean, ValidateIf } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  isSip?: boolean;

  @IsNumber()
  @ValidateIf((o) => o.isSip === true)
  @IsNotEmpty({ message: 'sipAmount is required when isSip is true' })
  sipAmount?: number;

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

  @IsBoolean()
  @IsOptional()
  isSip?: boolean;

  @IsNumber()
  @ValidateIf((o) => o.isSip === true)
  @IsNotEmpty({ message: 'sipAmount is required when isSip is true' })
  sipAmount?: number;

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
