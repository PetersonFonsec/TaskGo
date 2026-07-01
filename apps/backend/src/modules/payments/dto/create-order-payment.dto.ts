import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumberString, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CardPaymentDto {
  @IsNumberString()
  @Length(13, 19)
  number: string;

  @IsString()
  @IsNotEmpty()
  holderName: string;

  @IsInt()
  @Min(1)
  @Max(12)
  expMonth: number;

  @IsInt()
  @Min(2026)
  expYear: number;

  @IsNumberString()
  @Length(3, 4)
  cvv: string;
}

export class CreateOrderPaymentDto {
  @IsIn([PaymentMethod.PIX, PaymentMethod.CARTAO])
  method: PaymentMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => CardPaymentDto)
  card?: CardPaymentDto | null;
}
