import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  MaxLength,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { OrderPhotoType } from '@prisma/client';

export class FinishOrderPhotoDto {
  @IsString()
  url: string;

  @IsEnum(OrderPhotoType)
  type: OrderPhotoType;
}

export class FinishOrderDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  finalPrice: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  providerNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  priceAdjustmentReason?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(0, { message: 'Fotos ainda não estão disponíveis' })
  @ValidateNested({ each: true })
  @Type(() => FinishOrderPhotoDto)
  photos: FinishOrderPhotoDto[] = [];
}
