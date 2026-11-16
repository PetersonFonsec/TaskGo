import { when } from '@shared/design-system/order-row/tg-order-format';
import type { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';

/** Situação do Pix na tela. */
export type OrderPixState =
  /** Ainda não há cobrança: "Gerar Pix". */
  | 'none'
  /** Pix gerado, válido e esperando o pagamento. */
  | 'pending'
  /** Pago ou autorizado. */
  | 'paid'
  /** Pix pendente com o prazo vencido. */
  | 'expired'
  /** Falhou, foi cancelado ou reembolsado, ou o status é desconhecido. */
  | 'unavailable';

export interface OrderPaymentView {
  title: string;
  /** "Bruno Lima · Sex, 14 nov, 14:00". */
  detail: string;
  /** Iniciais do prestador para o avatar. */
  initials: string;
  photoUrl: string | null;
  /** O valor que a API cobra (a taxa da plataforma já está dentro). */
  total: string | null;
  pix: OrderPixState;
  /** Código copia e cola; só com o Pix pendente. */
  code: string | null;
  /** Imagem do QR Code mandada pela API (URL ou data URI); só com o Pix pendente. */
  qrImage: string | null;
  /** "15:40" (hoje) ou "14/11, 15:40"; só com o Pix pendente. */
  validUntil: string | null;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DAY_TIME = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Pago ou autorizado (PaymentStatus do backend, nomes em português e em inglês). */
const PAID = new Set(['AUTORIZADO', 'PAGO', 'AUTHORIZED', 'CAPTURED', 'RELEASED']);
/** Ainda não cobrado: a tela oferece "Gerar Pix". */
const NOT_CHARGED = new Set(['CREATED']);

/**
 * O pedido e o pagamento prontos para a tela de pagamento (só Pix). O total
 * é o valor que a API cobra (`payment.amount`), ou, antes da cobrança, o
 * valor final ou estimado do pedido: a taxa da plataforma sai da parte do
 * prestador e não é somada ao que o cliente paga.
 */
export function orderPaymentView(
  order: OrderDetails,
  payment: OrderPaymentResponse | null,
  now: Date = new Date(),
): OrderPaymentView {
  const provider = order.provider?.name?.trim() || 'Prestador';
  const pix = pixState(payment, now);
  const total =
    money(payment?.amount) ?? money(order.payment?.finalAmount) ?? money(order.payment?.estimatedAmount) ?? money(order.service?.estimatedPrice);
  const expires = validDate(payment?.pix?.expiresAt);
  return {
    title: order.service?.title?.trim() || 'Serviço',
    detail: [provider, when(order.schedule?.scheduledFor, now)].join(' · '),
    initials: initials(provider),
    photoUrl: order.provider?.photoUrl?.trim() || null,
    total,
    pix,
    code: pix === 'pending' ? payment?.pix?.qrCode?.trim() || null : null,
    qrImage: pix === 'pending' ? payment?.pix?.qrCodeBase64?.trim() || null : null,
    validUntil: pix === 'pending' && expires ? (sameDay(expires, now) ? TIME : DAY_TIME).format(expires) : null,
  };
}

function pixState(payment: OrderPaymentResponse | null, now: Date): OrderPixState {
  if (!payment || NOT_CHARGED.has(payment.status)) return 'none';
  if (PAID.has(payment.status)) return 'paid';
  if (payment.status !== 'PENDENTE') return 'unavailable';
  const expires = validDate(payment.pix?.expiresAt);
  if (expires && expires.getTime() <= now.getTime()) return 'expired';
  return payment.pix?.qrCode?.trim() ? 'pending' : 'unavailable';
}

function money(value: unknown): string | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? BRL.format(value) : null;
}

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? '').join('');
}
