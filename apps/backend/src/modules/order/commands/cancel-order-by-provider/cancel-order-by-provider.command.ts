import { CancelOrderByProviderDto } from '../../dto/cancel-order-by-provider.dto';

export class CancelOrderByProviderCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly providerId: bigint,
    public readonly payload: CancelOrderByProviderDto,
  ) {}
}
