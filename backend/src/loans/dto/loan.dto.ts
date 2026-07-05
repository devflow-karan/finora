import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  lender: string;

  @IsNumber()
  @IsNotEmpty()
  principal: number;

  @IsNumber()
  @IsNotEmpty()
  interestRate: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['SIMPLE', 'COMPOUND'])
  interestType: string;

  @IsNumber()
  @IsNotEmpty()
  emi: number;

  @IsNumber()
  @IsNotEmpty()
  outstanding: number;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['INTEREST_FREE', 'INTEREST_BEARING'])
  type: string;
}

export class UpdateLoanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsNumber()
  @IsOptional()
  principal?: number;

  @IsNumber()
  @IsOptional()
  interestRate?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['SIMPLE', 'COMPOUND'])
  interestType?: string;

  @IsNumber()
  @IsOptional()
  emi?: number;

  @IsNumber()
  @IsOptional()
  outstanding?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['INTEREST_FREE', 'INTEREST_BEARING'])
  type?: string;
}

export class CreateExtraPaymentDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
