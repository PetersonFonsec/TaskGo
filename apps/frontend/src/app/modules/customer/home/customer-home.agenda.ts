import type { TgAppointmentData } from '@shared/design-system/appointment-card/tg-appointment-card.component';
import {
  type TgAppointmentSource,
  toTgAppointment,
} from '@shared/design-system/appointment-card/tg-appointment-card.mapper';
import type { TgOrderRowData } from '@shared/design-system/order-row/tg-order-row.component';
import { toTgOrderRow } from '@shared/design-system/order-row/tg-order-row.mapper';
import { tgOrderNextStep } from '@shared/design-system/order-row/tg-order-status';

/** Pedidos encerrados: vão para o histórico, nunca para a agenda. */
const CLOSED_STATUSES: ReadonlySet<string> = new Set(['CONCLUIDO', 'CANCELADO', 'REJEITADO']);

/**
 * Status de um atendimento em curso, que pode ir para o destaque. Fora
 * daqui e fora dos encerrados ficam `DISPUTA` ("Em análise": um problema
 * relatado, não uma visita marcada) e status desconhecidos ("Em
 * atualização"): continuam visíveis na lista, mas nunca no destaque.
 */
const SCHEDULED_STATUSES: ReadonlySet<string> = new Set([
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
  'AGENDADO',
  'EM_DESLOCAMENTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONFIRMACAO_CLIENTE',
]);

/** Quantos pedidos ativos aparecem na lista. */
export const CUSTOMER_HOME_UPCOMING_LIMIT = 3;
/** Quantos pedidos encerrados aparecem no histórico. */
export const CUSTOMER_HOME_HISTORY_LIMIT = 3;

/**
 * O pedido da lista do cliente (GET /order/client/:id), com as datas que
 * ordenam o histórico. Todas vêm da API; nenhuma é calculada aqui.
 */
export interface CustomerHomeOrderSource extends TgAppointmentSource {
  requestedAt?: unknown;
  /** Último evento de cancelamento ou expiração informado pela API. */
  canceledAt?: unknown;
  /** O cliente confirmou a conclusão. */
  clientConfirmedAt?: unknown;
  /** O prestador finalizou o serviço. */
  providerFinishedAt?: unknown;
  payment?:
    | (TgAppointmentSource['payment'] & { canceledAt?: unknown; refundedAt?: unknown })
    | null;
}

export interface CustomerHomeAgenda {
  /** O card em destaque: o ativo que pede ação do cliente ou, senão, o de data mais próxima. */
  highlight: TgAppointmentData | null;
  /** Em análise (disputa) e status desconhecido primeiro; depois os demais ativos por data (até 3). */
  upcoming: TgOrderRowData[];
  /** Encerrados, o encerramento mais recente primeiro (até 3). */
  history: TgOrderRowData[];
}

/**
 * Separa os pedidos do cliente para a tela inicial (Etapa 9, decisão 1):
 * - o destaque é um atendimento em curso (SCHEDULED_STATUSES): o que pede
 *   ação do cliente (Pagar, Ver QR Code, Confirmar conclusão) e, se nenhum
 *   pede, o de data mais próxima; sem data vai para o fim;
 * - a lista traz primeiro os pedidos em análise (DISPUTA) ou com status
 *   desconhecido, que nunca vão para o destaque mas não podem sumir; depois
 *   os demais em curso, por data;
 * - o histórico ordena pela data de encerramento (`closedAt`);
 * - empate mantém a ordem da API; a entrada não é alterada.
 */
export function customerHomeAgenda(orders: readonly CustomerHomeOrderSource[]): CustomerHomeAgenda {
  const scheduled: CustomerHomeOrderSource[] = [];
  const review: CustomerHomeOrderSource[] = [];
  const closed: CustomerHomeOrderSource[] = [];
  for (const order of orders) {
    if (CLOSED_STATUSES.has(order.status)) closed.push(order);
    else if (SCHEDULED_STATUSES.has(order.status)) scheduled.push(order);
    else review.push(order);
  }

  const byDate = sortBy(scheduled, (order) => timeOf(order.scheduledFor), 'asc');
  const highlight = byDate.find((order) => customerStep(order)) ?? byDate[0] ?? null;

  const upcoming = [
    ...sortBy(review, (order) => timeOf(order.scheduledFor), 'asc'),
    ...byDate.filter((order) => order !== highlight),
  ]
    .slice(0, CUSTOMER_HOME_UPCOMING_LIMIT)
    .map((order) => toTgOrderRow(order, 'customer'));

  const history = sortBy(closed, closedAt, 'desc')
    .slice(0, CUSTOMER_HOME_HISTORY_LIMIT)
    .map((order) => toTgOrderRow(order, 'customer'));

  return {
    highlight: highlight ? toTgAppointment(highlight, 'customer') : null,
    upcoming,
    history,
  };
}

/**
 * Quando o pedido foi encerrado, só com datas reais da API:
 * - concluído: a confirmação do cliente ou, sem ela, a finalização do prestador;
 * - cancelado ou recusado: o último evento de cancelamento/expiração,
 *   seguido pelas datas de cancelamento/reembolso do pagamento.
 * Sem data de encerramento válida, vale a data do pedido (`requestedAt`,
 * sempre preenchida pelo backend), que é anterior ao encerramento. Sem
 * nenhuma data válida, o pedido vai para o fim.
 */
function closedAt(order: CustomerHomeOrderSource): number | null {
  const closing =
    order.status === 'CONCLUIDO'
      ? (timeOf(order.clientConfirmedAt) ?? timeOf(order.providerFinishedAt))
      : (timeOf(order.canceledAt) ??
        timeOf(order.payment?.canceledAt) ??
        timeOf(order.payment?.refundedAt));
  return closing ?? timeOf(order.requestedAt);
}

function customerStep(order: CustomerHomeOrderSource): boolean {
  return (
    tgOrderNextStep(
      { id: order.id, status: order.status, paymentStatus: order.payment?.status ?? null },
      'customer',
    ) !== null
  );
}

/** Ordena sem mudar a entrada; sem data (null) sempre no fim; empate mantém a ordem original. */
function sortBy<T>(
  items: readonly T[],
  key: (item: T) => number | null,
  direction: 'asc' | 'desc',
): T[] {
  return items
    .map((item, index) => ({ item, index, time: key(item) }))
    .sort((a, b) => {
      if (a.time === null || b.time === null) {
        return a.time === b.time ? a.index - b.index : a.time === null ? 1 : -1;
      }
      const diff = direction === 'asc' ? a.time - b.time : b.time - a.time;
      return diff || a.index - b.index;
    })
    .map(({ item }) => item);
}

function timeOf(value: unknown): number | null {
  if (!(typeof value === 'string' || typeof value === 'number' || value instanceof Date))
    return null;
  if (value === '') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
