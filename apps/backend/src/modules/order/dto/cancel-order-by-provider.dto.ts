import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderCancellationReason } from '@prisma/client';

export class CancelOrderByProviderDto {
  @IsEnum(OrderCancellationReason)
  reason: OrderCancellationReason;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(500)
  note?: string;
}
