export class ConfirmOrderByProviderCommand {
  constructor(
    public readonly orderId: bigint,
    public readonly providerId: bigint,
  ) {}
}
