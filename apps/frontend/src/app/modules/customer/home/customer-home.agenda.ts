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

/** Quantos pedidos ativos aparecem abaixo do destaque. */
export const CUSTOMER_HOME_UPCOMING_LIMIT = 3;
/** Quantos pedidos encerrados aparecem no histórico. */
export const CUSTOMER_HOME_HISTORY_LIMIT = 3;

/** O pedido da lista do cliente, com a data do pedido para ordenar o histórico. */
export interface CustomerHomeOrderSource extends TgAppointmentSource {
  requestedAt?: unknown;
}

export interface CustomerHomeAgenda {
  /** O card em destaque: o ativo que pede ação do cliente ou, senão, o de data mais próxima. */
  highlight: TgAppointmentData | null;
  /** Os demais ativos, data mais próxima primeiro (até 3). */
  upcoming: TgOrderRowData[];
  /** Encerrados, mais recentes primeiro (até 3). */
  history: TgOrderRowData[];
}

/**
 * Separa os pedidos do cliente para a tela inicial (Etapa 9, decisão 1):
 * - ativos são todos os não encerrados (inclusive status desconhecido, que
 *   aparece como "Em atualização");
 * - o destaque é o ativo que pede ação do cliente (Pagar, Ver QR Code,
 *   Confirmar conclusão) e, se nenhum pede, o de data mais próxima; sem
 *   data vai para o fim; empate mantém a ordem da API;
 * - o histórico usa a data marcada ou, sem ela, a do pedido.
 */
export function customerHomeAgenda(orders: readonly CustomerHomeOrderSource[]): CustomerHomeAgenda {
  const active: CustomerHomeOrderSource[] = [];
  const closed: CustomerHomeOrderSource[] = [];
  for (const order of orders) (CLOSED_STATUSES.has(order.status) ? closed : active).push(order);

  const byDate = sortBy(active, (order) => timeOf(order.scheduledFor), 'asc');
  const needsAction = byDate.filter((order) => customerStep(order));
  const highlight = needsAction[0] ?? byDate[0] ?? null;

  const upcoming = byDate
    .filter((order) => order !== highlight)
    .slice(0, CUSTOMER_HOME_UPCOMING_LIMIT)
    .map((order) => toTgOrderRow(order, 'customer'));

  const history = sortBy(
    closed,
    (order) => timeOf(order.scheduledFor) ?? timeOf(order.requestedAt),
    'desc',
  )
    .slice(0, CUSTOMER_HOME_HISTORY_LIMIT)
    .map((order) => toTgOrderRow(order, 'customer'));

  return { highlight: highlight ? toTgAppointment(highlight, 'customer') : null, upcoming, history };
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
function sortBy<T>(items: readonly T[], key: (item: T) => number | null, direction: 'asc' | 'desc'): T[] {
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
  if (!(typeof value === 'string' || typeof value === 'number' || value instanceof Date)) return null;
  if (value === '') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}
