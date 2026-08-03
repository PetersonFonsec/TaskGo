export class GetOrderPaymentQuery {
  constructor(
    public readonly orderId: bigint,
    public readonly clientId: bigint,
  ) {}
}
