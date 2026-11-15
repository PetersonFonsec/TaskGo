import { toNumber } from '../provider-card/tg-provider';
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
  estimatedPrice?: unknown;
  providerFinishedAt?: unknown;
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
 * - valor: o do serviço (bruto, não o ganho do prestador), por `tgOrderAmount`.
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
    amount: tgOrderAmount(order)?.value ?? null,
    paymentStatus: order.payment?.status ?? null,
    reviewed: order.review != null && order.review.id != null && order.review.id !== '',
  };
}

function toDateInput(value: unknown): string | number | Date | null {
  return typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
}

/** Valor do serviço e de onde ele vem: estimado ou final. */
export interface TgOrderAmount {
  value: number;
  kind: 'estimated' | 'final';
}

/**
 * O valor bruto do serviço (o que o cliente paga; não é o ganho do
 * prestador, que desconta a taxa). No backend, `finalPrice` nasce igual ao
 * preço base e só vira o valor final quando o prestador finaliza o serviço
 * (`providerFinishedAt`). Por isso:
 * - finalizado: `finalPrice` (ou `payment.amount`, que a API exige igual), "final";
 * - antes disso: `finalPrice`, `estimatedPrice` ou `payment.amount`, "estimated".
 * Sem valor válido (> 0): null.
 */
export function tgOrderAmount(order: Pick<TgOrderSource, 'finalPrice' | 'estimatedPrice' | 'providerFinishedAt' | 'payment'>): TgOrderAmount | null {
  const value = toAmount(order.finalPrice) ?? toAmount(order.estimatedPrice) ?? toAmount(order.payment?.amount);
  if (value === null) return null;
  return { value, kind: isPresent(order.providerFinishedAt) ? 'final' : 'estimated' };
}

function isPresent(value: unknown): boolean {
  return value instanceof Date ? !Number.isNaN(value.getTime()) : typeof value === 'string' ? value.trim() !== '' : false;
}

/**
 * Valor monetário: número, texto numérico ou Decimal. O interceptor da API
 * não reconhece o Decimal do Prisma (a classe é minificada), então ele chega
 * como { s, e, d }; `toNumber` (o mesmo do card de prestador) converte.
 * Ausente, inválido, não finito ou <= 0: null.
 */
export function toAmount(value: unknown): number | null {
  const n = toNumber(value);
  return n !== undefined && n > 0 ? n : null;
}
