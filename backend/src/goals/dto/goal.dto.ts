import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum([
    'EMERGENCY_FUND',
    'HOUSE',
    'CHILD_EDUCATION',
    'TRAVEL',
    'RETIREMENT',
    'VEHICLE',
    'WEDDING',
    'CUSTOM',
  ])
  type: string;

  @IsNumber()
  @IsNotEmpty()
  targetAmount: number;

  @IsNumber()
  @IsNotEmpty()
  currentAmount: number; // base contribution/cash allocation not in investments

  @IsDateString()
  @IsNotEmpty()
  expectedDate: string;
}

export class UpdateGoalDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum([
    'EMERGENCY_FUND',
    'HOUSE',
    'CHILD_EDUCATION',
    'TRAVEL',
    'RETIREMENT',
    'VEHICLE',
    'WEDDING',
    'CUSTOM',
  ])
  type?: string;

  @IsNumber()
  @IsOptional()
  targetAmount?: number;

  @IsNumber()
  @IsOptional()
  currentAmount?: number;

  @IsDateString()
  @IsOptional()
  expectedDate?: string;
}
