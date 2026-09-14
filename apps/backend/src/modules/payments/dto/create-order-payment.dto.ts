import { IsEmpty, IsIn } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderPaymentDto {
  @IsIn([PaymentMethod.PIX])
  method: PaymentMethod;

  @IsEmpty({
    message: 'Não envie dados de cartão; somente PIX está disponível',
  })
  card?: never;
}
