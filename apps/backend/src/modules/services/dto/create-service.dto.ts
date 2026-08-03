import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ServiceStatus } from '@prisma/client';

export class CreateServiceDto {
  @IsNumberString()
  providerId: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  category: string;

  @Type(() => Number)
  @IsNumber()
  basePrice: number;

  @IsOptional()
  @IsObject()
  availability?: Record<string, unknown>;

  @IsEnum(ServiceStatus)
  status: ServiceStatus;
}
