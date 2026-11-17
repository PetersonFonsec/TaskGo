import type { TgOrderRowData } from '@shared/design-system/order-row/tg-order-row.component';
import { type TgOrderSource, toTgOrderRow } from '@shared/design-system/order-row/tg-order-row.mapper';
import { type TgOrderPerspective, tgOrderNextStep } from '@shared/design-system/order-row/tg-order-status';

/** O pedido das listagens (GET /order/client/:id e /order/provider/:id), com as datas que ordenam as abas. */
export interface OrderTabsSource extends TgOrderSource {
  requestedAt?: unknown;
  clientConfirmedAt?: unknown;
  providerFinishedAt?: unknown;
  payment?: (TgOrderSource['payment'] & { canceledAt?: unknown; refundedAt?: unknown }) | null;
}

export interface OrderTab {
  value: string;
  label: string;
  /** Mostra a contagem na aba (só onde ajuda a decidir). */
  counted: boolean;
  orders: TgOrderRowData[];
}

const CLOSED: ReadonlySet<string> = new Set(['CONCLUIDO', 'CANCELADO', 'REJEITADO']);
const CANCELED: ReadonlySet<string> = new Set(['CANCELADO', 'REJEITADO']);

/**
 * As abas da tela Pedidos, no mapa do Design System:
 * - cliente: Ativos (tudo que não encerrou), Concluídos e Cancelados
 *   (cancelados e recusados);
 * - prestador: Solicitações (aguardando a resposta dele), Agendados (os
 *   demais em curso, inclusive em análise e status desconhecido) e
 *   Histórico (encerrados).
 * Em curso: primeiro o que pede ação de quem vê, depois por data (a mais
 * próxima primeiro, sem data no fim). Encerrados: o encerramento mais
 * recente primeiro. Empate mantém a ordem da API; nenhum pedido some.
 */
export function orderTabs(orders: readonly OrderTabsSource[], perspective: TgOrderPerspective): OrderTab[] {
  const row = (order: OrderTabsSource) => toTgOrderRow(order, perspective);
  const active = (list: OrderTabsSource[]) => sortActive(list, perspective).map(row);
  const closed = (list: OrderTabsSource[]) => sortBy(list, closedAt, 'desc').map(row);

  if (perspective === 'customer') {
    return [
      { value: 'ativos', label: 'Ativos', counted: true, orders: active(orders.filter((o) => !CLOSED.has(o.status))) },
      { value: 'concluidos', label: 'Concluídos', counted: false, orders: closed(orders.filter((o) => o.status === 'CONCLUIDO')) },
      { value: 'cancelados', label: 'Cancelados', counted: false, orders: closed(orders.filter((o) => CANCELED.has(o.status))) },
    ];
  }

  const requests = orders.filter((o) => o.status === 'AGUARDANDO_APROVACAO');
  const scheduled = orders.filter((o) => o.status !== 'AGUARDANDO_APROVACAO' && !CLOSED.has(o.status));
  return [
    { value: 'solicitacoes', label: 'Solicitações', counted: true, orders: active(requests) },
    { value: 'agendados', label: 'Agendados', counted: false, orders: active(scheduled) },
    { value: 'historico', label: 'Histórico', counted: false, orders: closed(orders.filter((o) => CLOSED.has(o.status))) },
  ];
}

function sortActive(orders: readonly OrderTabsSource[], perspective: TgOrderPerspective): OrderTabsSource[] {
  const byDate = sortBy(orders, (order) => timeOf(order.scheduledFor), 'asc');
  const needsAction = (order: OrderTabsSource) =>
    tgOrderNextStep({ id: order.id, status: order.status, paymentStatus: order.payment?.status ?? null }, perspective) !== null;
  return [...byDate.filter(needsAction), ...byDate.filter((order) => !needsAction(order))];
}

/**
 * Quando o pedido foi encerrado, só com datas reais da API: concluído pela
 * confirmação do cliente (ou a finalização do prestador); cancelado ou
 * recusado pelo cancelamento ou reembolso do pagamento. Sem elas, a data do
 * pedido.
 */
function closedAt(order: OrderTabsSource): number | null {
  const closing =
    order.status === 'CONCLUIDO'
      ? (timeOf(order.clientConfirmedAt) ?? timeOf(order.providerFinishedAt))
      : (timeOf(order.payment?.canceledAt) ?? timeOf(order.payment?.refundedAt));
  return closing ?? timeOf(order.requestedAt);
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
