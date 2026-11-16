import type { TgIconName } from '@taskgo/icons';
import type { TgBadgeTone } from '@shared/design-system/badge/tg-badge.component';
import { TG_NO_DATE, tgDistance, tgWhenParts } from '@shared/design-system/order-row/tg-order-format';
import {
  type TgOrderNextStep,
  type TgOrderPerspective,
  tgOrderNextStep,
  tgOrderStatus,
  tgOrderStatusIcon,
} from '@shared/design-system/order-row/tg-order-status';
import type { OrderDetails, OrderTimelineEvent } from '@shared/service/order/order.model';

export interface OrderDetailsPerson {
  /** "Prestador" para o cliente, "Cliente" para o prestador. */
  role: string;
  name: string;
  photoUrl: string | null;
  initials: string;
  verified: boolean;
  /** "4,8 (32 avaliações)"; sem avaliação ou para o prestador, null. */
  rating: string | null;
}

export interface OrderDetailsRow {
  label: string;
  value: string;
}

export interface OrderDetailsView {
  id: string;
  title: string;
  /** "Pedido #1042 · Elétrica". */
  eyebrow: string;
  /** "Solicitado em 12 de novembro de 2026"; sem data válida, null. */
  requested: string | null;
  /** { day: 'Hoje', time: '14:00' }; sem data marcada, o dia é "Data a combinar" e a hora vazia. */
  when: { day: string; time: string };
  status: { label: string; tone: TgBadgeTone; icon: TgIconName | null };
  /** "Rua Harmonia, 123, apto 41 · Vila Madalena"; sem endereço, null. */
  address: string | null;
  /** "São Paulo / SP · CEP 05435-000 · 3,2 km de você"; sem nada, null. */
  addressDetail: string | null;
  person: OrderDetailsPerson;
  /** O mesmo próximo passo da linha e do card de agendamento. */
  step: TgOrderNextStep | null;
  /** "Reportar problema", ao lado de "Confirmar conclusão" (só o cliente). */
  reportLink: readonly string[] | null;
  /** Valor, forma e situação do pagamento; sem pagamento, só o valor. */
  payment: OrderDetailsRow[];
  /** Só o prestador: a parte dele e a taxa da plataforma. */
  earnings: OrderDetailsRow[];
  /** Depois da finalização: observações do prestador e motivo do ajuste de preço. */
  completion: OrderDetailsRow[];
  /** A avaliação feita pelo cliente. */
  review: { rating: number; comment: string | null } | null;
  cancellation: { title: string; reason: string; note: string | null } | null;
  timeline: OrderTimelineEvent[];
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const ONE_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const PERCENT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const LONG_DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

const PAYMENT_METHODS: Record<string, string> = { PIX: 'Pix', CARTAO: 'Cartão', OUTRO: 'Outra forma' };

/**
 * Situação do pagamento (enum PaymentStatus do backend, com os nomes em
 * inglês e em português). Desconhecida: "Em atualização", nunca o código cru.
 */
const PAYMENT_STATUSES: Record<string, string> = {
  CREATED: 'Ainda não pago',
  PENDENTE: 'Aguardando pagamento',
  AUTHORIZED: 'Autorizado',
  AUTORIZADO: 'Autorizado',
  CAPTURED: 'Pago',
  PAGO: 'Pago',
  RELEASED: 'Pago',
  REFUNDED: 'Reembolsado',
  REEMBOLSADO: 'Reembolsado',
  FAILED: 'Não aprovado',
  FALHOU: 'Não aprovado',
  CANCELED: 'Cancelado',
  CANCELADO: 'Cancelado',
};

/**
 * O detalhe do pedido (GET /orders/:id) pronto para a tela, na perspectiva
 * de quem vê: status e próximo passo pelo mapa do DS, só a outra pessoa, e
 * o que a API manda para cada um (a parte do prestador e a distância só
 * chegam para ele). Campos ausentes somem; nada é inventado.
 */
export function orderDetailsView(
  order: OrderDetails,
  perspective: TgOrderPerspective,
  now: Date = new Date(),
): OrderDetailsView {
  const status = tgOrderStatus(order.status, perspective);
  const parts = tgWhenParts(order.schedule?.scheduledFor, now);
  const category = order.service?.category?.trim();
  const finalAmount = validMoney(order.payment?.finalAmount);
  const estimated = validMoney(order.payment?.estimatedAmount) ?? validMoney(order.service?.estimatedPrice);
  const step = tgOrderNextStep(
    { id: order.id, status: order.status, reviewed: !!order.review, paymentStatus: order.payment?.status ?? null },
    perspective,
  );

  return {
    id: order.id,
    title: order.service?.title?.trim() || 'Serviço',
    eyebrow: [`Pedido #${order.id}`, category].filter(Boolean).join(' · '),
    requested: formatDate(order.schedule?.requestedAt, (date) => `Solicitado em ${LONG_DATE.format(date)}`),
    when: parts ?? { day: TG_NO_DATE, time: '' },
    status: { ...status, icon: tgOrderStatusIcon(order.status) },
    ...address(order, perspective),
    person: person(order, perspective),
    step,
    reportLink:
      perspective === 'customer' && order.status === 'AGUARDANDO_CONFIRMACAO_CLIENTE'
        ? ['/orders', order.id, 'report-problem']
        : null,
    payment: payment(order, finalAmount, estimated),
    earnings: perspective === 'provider' ? earnings(order, finalAmount !== null) : [],
    completion: [
      row('Observações do prestador', order.completion?.providerNotes),
      row('Motivo do ajuste de preço', order.priceAdjustmentReason),
    ].filter((item): item is OrderDetailsRow => item !== null),
    review: review(order),
    cancellation:
      order.status === 'CANCELADO' && order.cancellation?.label
        ? {
            title:
              perspective === 'provider' ? 'Você recusou esta solicitação' : 'O prestador não pôde atender este pedido',
            reason: order.cancellation.label,
            note: order.cancellation.note?.trim() || null,
          }
        : null,
    timeline: Array.isArray(order.timeline) ? order.timeline : [],
  };
}

/**
 * O prazo antes da expiração automática (aguardando resposta ou pagamento),
 * na perspectiva de quem vê. Fora desses estados, null.
 */
export function orderExpiryNotice(
  order: OrderDetails,
  perspective: TgOrderPerspective,
  now: Date = new Date(),
): { title: string; body: string } | null {
  if (!order.expiresAt) return null;
  const expires = new Date(order.expiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  const approval = order.status === 'AGUARDANDO_APROVACAO';
  const body = 'Depois disso o pedido expira e o horário é liberado.';
  if (expires.getTime() <= now.getTime()) {
    return { title: 'O prazo terminou', body: 'O pedido será expirado automaticamente e o horário é liberado.' };
  }
  const time = TIME.format(expires);
  const customer = perspective === 'customer';
  if (approval) {
    return { title: customer ? `O prestador tem até ${time} para responder` : `Responda até ${time}`, body };
  }
  return { title: customer ? `Pague até ${time}` : `O cliente tem até ${time} para pagar`, body };
}

function address(order: OrderDetails, perspective: TgOrderPerspective) {
  const a = order.address;
  const street = [a?.street, a?.number, a?.complement].map((part) => part?.trim()).filter(Boolean).join(', ');
  const line = [street, a?.neighborhood?.trim()].filter(Boolean).join(' · ');
  const city = [a?.city?.trim(), a?.state?.trim()].filter(Boolean).join(' / ');
  const distance = perspective === 'provider' ? tgDistance(order.distanceKm) : null;
  const detail = [city, a?.cep?.trim() ? `CEP ${a.cep.trim()}` : '', distance ? `${distance} de você` : '']
    .filter(Boolean)
    .join(' · ');
  return { address: line || null, addressDetail: detail || null };
}

function person(order: OrderDetails, perspective: TgOrderPerspective): OrderDetailsPerson {
  const other = perspective === 'customer' ? order.provider : order.client;
  const name = other?.name?.trim() || (perspective === 'customer' ? 'Prestador' : 'Cliente');
  const count = perspective === 'customer' ? Number(other?.ratingCount) : 0;
  const avg = Number(other?.ratingAvg);
  return {
    role: perspective === 'customer' ? 'Prestador' : 'Cliente',
    name,
    photoUrl: other?.photoUrl?.trim() || null,
    initials: initials(name),
    verified: perspective === 'customer' && other?.verified === true,
    rating:
      Number.isFinite(count) && count > 0 && Number.isFinite(avg) && avg > 0
        ? `${ONE_DECIMAL.format(avg)} (${count} ${count === 1 ? 'avaliação' : 'avaliações'})`
        : null,
  };
}

function payment(order: OrderDetails, finalAmount: number | null, estimated: number | null): OrderDetailsRow[] {
  const rows: (OrderDetailsRow | null)[] = [
    finalAmount !== null
      ? { label: 'Valor final', value: BRL.format(finalAmount) }
      : estimated !== null
        ? { label: 'Valor estimado', value: BRL.format(estimated) }
        : null,
  ];
  const p = order.payment;
  if (p) {
    rows.push(row('Forma de pagamento', PAYMENT_METHODS[p.method] ?? null));
    rows.push({ label: 'Situação', value: PAYMENT_STATUSES[p.status] ?? 'Em atualização' });
  }
  return rows.filter((item): item is OrderDetailsRow => item !== null);
}

function earnings(order: OrderDetails, final: boolean): OrderDetailsRow[] {
  const e = order.providerEarnings;
  const net = validMoney(e?.netAmount);
  if (!e || net === null) return [];
  const pct = Number(e.feePct);
  const fee = Number(e.feeAmount);
  const rows: OrderDetailsRow[] = [{ label: final ? 'Sua parte' : 'Sua parte (estimada)', value: BRL.format(net) }];
  if (Number.isFinite(pct) && pct >= 0 && Number.isFinite(fee) && fee >= 0) {
    rows.push({ label: 'Taxa da plataforma', value: `${PERCENT.format(pct * 100)}% · ${BRL.format(fee)}` });
  }
  return rows;
}

function review(order: OrderDetails): OrderDetailsView['review'] {
  const rating = Number(order.review?.rating);
  if (!order.review || !Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  return { rating, comment: order.review.comment?.trim() || null };
}

function row(label: string, value: string | null | undefined): OrderDetailsRow | null {
  const text = value?.trim();
  return text ? { label, value: text } : null;
}

function validMoney(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatDate(value: string | null | undefined, format: (date: Date) => string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format(date);
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? '').join('');
}
