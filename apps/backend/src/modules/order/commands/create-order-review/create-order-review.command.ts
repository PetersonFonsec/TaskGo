import { CreateOrderReviewDto } from '../../dto/create-order-review.dto';

export class CreateOrderReviewCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly clientId: bigint,
    public readonly payload: CreateOrderReviewDto,
  ) {}
}
