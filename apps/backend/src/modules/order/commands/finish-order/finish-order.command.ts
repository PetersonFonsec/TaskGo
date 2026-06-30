import { FinishOrderDto } from '../../dto/finish-order.dto';

export class FinishOrderCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly providerId: bigint,
    public readonly payload: FinishOrderDto,
  ) {}
}
