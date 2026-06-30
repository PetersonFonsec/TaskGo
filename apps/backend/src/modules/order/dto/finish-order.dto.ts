import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
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
  providerNotes?: string;

  @IsOptional()
  @IsString()
  priceAdjustmentReason?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FinishOrderPhotoDto)
  photos: FinishOrderPhotoDto[] = [];
}
