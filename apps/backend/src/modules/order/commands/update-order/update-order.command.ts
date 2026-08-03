import { UpdateOrderDto } from '../../dto/update-order.dto';

export class UpdateOrderCommand {
  constructor(
    public readonly id: bigint,
    public readonly payload: UpdateOrderDto,
  ) {}
}
