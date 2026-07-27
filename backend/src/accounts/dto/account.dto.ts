import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsNumber()
  @IsOptional()
  openingBalance?: number;
}
