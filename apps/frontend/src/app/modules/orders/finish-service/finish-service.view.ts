import type { TgIconName } from '@taskgo/icons';
import type { TgBadgeTone } from '@shared/design-system/badge/tg-badge.component';
import { TG_NO_DATE, tgWhenParts } from '@shared/design-system/order-row/tg-order-format';
import { tgOrderStatus, tgOrderStatusIcon } from '@shared/design-system/order-row/tg-order-status';
import type { OrderDetails } from '@shared/service/order/order.model';
import { orderDetailsView, type OrderDetailsPerson } from '../order-details/order-details.view';

/**
 * Único status em que o prestador finaliza o serviço: o backend recusa os
 * outros (`finish-order.handler.ts`: "Somente pedidos em andamento podem ser
 * finalizados").
 */
export const FINISHABLE_STATUS = 'EM_ANDAMENTO';

export const FINISH_TIME_ZONE = 'America/Sao_Paulo';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export interface FinishServiceView {
  id: string;
  title: string;
  /** "Pedido #1042 · Elétrica". */
  eyebrow: string;
  status: { label: string; tone: TgBadgeTone; icon: TgIconName | null };
  /** Só em andamento dá para finalizar. */
  canFinish: boolean;
  /** { day: 'Hoje', time: '14:00' } no horário de São Paulo; sem data, "Data a combinar". */
  when: { day: string; time: string };
  address: string | null;
  addressDetail: string | null;
  person: OrderDetailsPerson;
  /** O valor combinado na contratação, que vai como `finalPrice`; sem valor válido, null. */
  amount: number | null;
  /** "R$ 120,00"; sem valor, null. */
  amountLabel: string | null;
}

/**
 * O pedido (GET /orders/:id) pronto para a tela de finalizar, sempre na
 * perspectiva do prestador. Pessoa e endereço vêm do mesmo mapa dos detalhes
 * do pedido; o horário, no fuso de São Paulo.
 *
 * O valor enviado é o combinado: o backend exige `finalPrice` igual ao
 * `order.finalPrice` e ao valor pago (`finish-order.handler.ts`), e o
 * detalhe devolve `order.finalPrice` em `payment.finalAmount`. Sem ele, cai
 * no valor estimado, que nasce igual (`create-order.handler.ts`).
 */
export function finishServiceView(order: OrderDetails, now: Date = new Date()): FinishServiceView {
  const base = orderDetailsView(order, 'provider', now);
  const amount =
    validMoney(order.payment?.finalAmount) ??
    validMoney(order.payment?.estimatedAmount) ??
    validMoney(order.service?.estimatedPrice);
  return {
    id: order.id,
    title: base.title,
    eyebrow: base.eyebrow,
    status: { ...tgOrderStatus(order.status, 'provider'), icon: tgOrderStatusIcon(order.status) },
    canFinish: order.status === FINISHABLE_STATUS,
    when: tgWhenParts(order.schedule?.scheduledFor, now, FINISH_TIME_ZONE) ?? { day: TG_NO_DATE, time: '' },
    address: base.address,
    addressDetail: base.addressDetail,
    person: base.person,
    amount,
    amountLabel: amount === null ? null : BRL.format(amount),
  };
}

function validMoney(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
