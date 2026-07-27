import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreateInsuranceDto {
  @IsString()
  @IsNotEmpty()
  policyName: string;

  @IsString()
  @IsNotEmpty()
  policyNumber: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['LIFE', 'HEALTH', 'VEHICLE', 'HOME', 'PARENTS'])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  premium: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'])
  premiumFrequency: string;

  @IsDateString()
  @IsNotEmpty()
  renewalDate: string;

  @IsString()
  @IsOptional()
  nominee?: string;

  @IsNumber()
  @IsNotEmpty()
  coverage: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['ACTIVE', 'EXPIRED', 'LAPSED'])
  status: string;
}

export class UpdateInsuranceDto {
  @IsString()
  @IsOptional()
  policyName?: string;

  @IsString()
  @IsOptional()
  policyNumber?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['LIFE', 'HEALTH', 'VEHICLE', 'HOME', 'PARENTS'])
  type?: string;

  @IsNumber()
  @IsOptional()
  premium?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'])
  premiumFrequency?: string;

  @IsDateString()
  @IsOptional()
  renewalDate?: string;

  @IsString()
  @IsOptional()
  nominee?: string;

  @IsNumber()
  @IsOptional()
  coverage?: number;

  @IsString()
  @IsOptional()
  @IsEnum(['ACTIVE', 'EXPIRED', 'LAPSED'])
  status?: string;
}
