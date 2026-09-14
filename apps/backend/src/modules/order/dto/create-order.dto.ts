import { PaymentMethod } from '@prisma/client';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsISO8601,
  IsNumber,
  IsEnum,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressSnapDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class CreateOrderDto {
  @Matches(/^[1-9]\d*$/)
  addressId!: string;

  @IsOptional()
  @IsString()
  clientId!: string;

  @IsNotEmpty()
  @IsString()
  serviceId!: string;

  @IsNotEmpty()
  @IsISO8601()
  scheduledFor?: string;

  @IsOptional()
  @IsNumber()
  finalPrice?: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressSnapDto)
  address?: AddressSnapDto;
}
