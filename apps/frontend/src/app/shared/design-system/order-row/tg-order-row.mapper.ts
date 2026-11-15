import type { TgOrderPerspective } from './tg-order-status';
import type { TgOrderRowData } from './tg-order-row.component';

/**
 * O mínimo do pedido da API (GET /orders do cliente e do prestador, o
 * `OrderModel` do front) que a linha usa. Estrutural, para o Design System
 * não depender do modelo inteiro.
 */
export interface TgOrderSource {
  id: string;
  status: string;
  scheduledFor?: unknown;
  finalPrice?: unknown;
  client?: { name?: string | null } | null;
  service?: { title?: string | null; provider?: { user?: { name?: string | null } | null } | null } | null;
  payment?: { status?: string | null; amount?: unknown } | null;
  addressSnap?: { neighborhood?: string | null } | null;
  review?: { id?: string | null } | null;
}

/**
 * Converte o pedido da API nos dados da linha:
 * - `review` presente (com id) vira `reviewed: true`, e o "Avaliar" some;
 * - `payment.status` vira `paymentStatus` ("Pagar" ou "Ver QR Code");
 * - a outra pessoa é o profissional para o cliente e o cliente para o prestador;
 * - valor: o final, se houver, senão o do pagamento; só número válido.
 * A distância não vem nas listagens, então fica de fora.
 */
export function toTgOrderRow(order: TgOrderSource, perspective: TgOrderPerspective): TgOrderRowData {
  const person = perspective === 'customer' ? order.service?.provider?.user?.name : order.client?.name;
  return {
    id: order.id,
    status: order.status,
    service: order.service?.title?.trim() || 'Serviço',
    person: person?.trim() || null,
    scheduledFor: toDateInput(order.scheduledFor),
    neighborhood: order.addressSnap?.neighborhood?.trim() || null,
    amount: toAmount(order.finalPrice) ?? toAmount(order.payment?.amount),
    paymentStatus: order.payment?.status ?? null,
    reviewed: order.review != null && order.review.id != null && order.review.id !== '',
  };
}

function toDateInput(value: unknown): string | number | Date | null {
  return typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
}

/** Decimal chega como número (interceptor da API) ou texto; outro formato fica sem valor. */
function toAmount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
