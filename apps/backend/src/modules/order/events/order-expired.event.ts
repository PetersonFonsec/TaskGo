import { OrderStatus } from '@prisma/client';

import { OrderExpirationReason } from '../expiration/order-expiration.policy';

/**
 * Publicado após a expiração automática de um pedido ser confirmada no banco.
 * Ponto de extensão para avisar cliente e prestador (ex.: @EventsHandler).
 */
export class OrderExpiredEvent {
  constructor(
    public readonly orderId: bigint,
    public readonly previousStatus: OrderStatus,
    public readonly reason: OrderExpirationReason,
    public readonly expiredAt: Date,
  ) {}
}
