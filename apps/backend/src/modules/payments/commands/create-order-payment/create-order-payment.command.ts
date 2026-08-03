import { CreateOrderPaymentDto } from '../../dto/create-order-payment.dto';

export class CreateOrderPaymentCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly clientId: bigint,
    public readonly payload: CreateOrderPaymentDto,
  ) {}
}
