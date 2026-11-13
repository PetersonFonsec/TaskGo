import { CreateOrderDto } from '../../dto/create-order.dto';

export class CreateOrderCommand {
  constructor(
    public readonly payload: CreateOrderDto,
    /** Header Idempotency-Key: repetir a mesma chave devolve o pedido já criado. */
    public readonly idempotencyKey?: string,
  ) {}
}
