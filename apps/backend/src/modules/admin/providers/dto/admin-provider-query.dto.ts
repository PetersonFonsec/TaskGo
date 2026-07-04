import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ProviderStatus } from '@prisma/client';

export class AdminProviderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @IsEnum(ProviderStatus)
  status?: ProviderStatus;

  @IsOptional()
  @IsISO8601()
  submittedFrom?: string;

  @IsOptional()
  @IsISO8601()
  submittedTo?: string;
}
