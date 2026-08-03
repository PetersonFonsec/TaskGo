export class CancelOrderByProviderCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly providerId: bigint,
  ) {}
}
