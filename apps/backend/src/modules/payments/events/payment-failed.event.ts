export class PaymentFailedEvent { constructor(public readonly paymentId: bigint, public readonly reason?: string) {} }
