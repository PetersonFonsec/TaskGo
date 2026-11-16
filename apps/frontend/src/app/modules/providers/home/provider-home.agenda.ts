import type { TgAppointmentData } from '@shared/design-system/appointment-card/tg-appointment-card.component';
import {
  type TgAppointmentSource,
  toTgAppointment,
} from '@shared/design-system/appointment-card/tg-appointment-card.mapper';
import type { TgOrderRowData } from '@shared/design-system/order-row/tg-order-row.component';
import { toTgOrderRow } from '@shared/design-system/order-row/tg-order-row.mapper';
import { tgWhenParts } from '@shared/design-system/order-row/tg-order-format';
import { tgOrderNextStep } from '@shared/design-system/order-row/tg-order-status';

/** Solicitação nova: o prestador ainda não respondeu. */
const REQUEST_STATUS = 'AGUARDANDO_APROVACAO';

/** Pedidos encerrados: ficam fora da agenda (os últimos serviços vêm do painel). */
const CLOSED_STATUSES: ReadonlySet<string> = new Set(['CONCLUIDO', 'CANCELADO', 'REJEITADO']);

/**
 * Atendimentos aceitos e ainda em curso, que podem ir para o destaque. Fora
 * daqui, da solicitação e dos encerrados ficam `DISPUTA` ("Em análise") e
 * status desconhecidos ("Em atualização"): continuam visíveis na lista, mas
 * nunca no destaque.
 */
const SCHEDULED_STATUSES: ReadonlySet<string> = new Set([
  'AGUARDANDO_PAGAMENTO',
  'AGENDADO',
  'EM_DESLOCAMENTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONFIRMACAO_CLIENTE',
]);

/**
 * Quantas linhas cada lista mostra antes de "Ver todas". A agenda devolve
 * todos os pedidos: o prestador não tem outra lista de pedidos no web, então
 * a tela abre o resto sob demanda em vez de cortar.
 */
export const PROVIDER_HOME_LIST_LIMIT = 10;

export interface ProviderHomeAgenda {
  /** O próximo atendimento: o que pede ação do prestador ou, senão, o de data mais próxima. */
  highlight: TgAppointmentData | null;
  /** Todas as solicitações aguardando resposta, a data mais próxima primeiro. */
  requests: TgOrderRowData[];
  /** Total de solicitações (o título). */
  requestCount: number;
  /** Em análise e status desconhecido primeiro; depois os demais em curso, por data. */
  upcoming: TgOrderRowData[];
  /** Atendimentos em curso marcados para hoje (a frase da saudação). */
  todayCount: number;
}

/**
 * Separa os pedidos do prestador (GET /order/provider/:id) para a tela
 * inicial (Etapa 9, decisões 1 a 3):
 * - solicitações (AGUARDANDO_APROVACAO) numa lista própria, com "Responder";
 * - o destaque é um atendimento em curso (SCHEDULED_STATUSES): o que pede
 *   ação do prestador (Estou a caminho, Iniciar serviço, Finalizar serviço)
 *   e, se nenhum pede, o de data mais próxima; sem data vai para o fim;
 * - "Também na agenda" traz primeiro os pedidos em análise (DISPUTA) ou com
 *   status desconhecido, que nunca vão para o destaque mas não podem sumir;
 *   depois os demais em curso, por data;
 * - encerrados ficam de fora;
 * - empate mantém a ordem da API; a entrada não é alterada.
 * `now` decide o que é "hoje" (o dia civil de quem vê).
 */
export function providerHomeAgenda(
  orders: readonly TgAppointmentSource[],
  now: Date = new Date(),
): ProviderHomeAgenda {
  const requests: TgAppointmentSource[] = [];
  const scheduled: TgAppointmentSource[] = [];
  const review: TgAppointmentSource[] = [];
  for (const order of orders) {
    if (order.status === REQUEST_STATUS) requests.push(order);
    else if (CLOSED_STATUSES.has(order.status)) continue;
    else if (SCHEDULED_STATUSES.has(order.status)) scheduled.push(order);
    else review.push(order);
  }

  const byDate = sortByDate(scheduled);
  const highlight = byDate.find((order) => providerStep(order)) ?? byDate[0] ?? null;

  const upcoming = [...sortByDate(review), ...byDate.filter((order) => order !== highlight)].map((order) =>
    toTgOrderRow(order, 'provider'),
  );

  return {
    highlight: highlight ? toTgAppointment(highlight, 'provider') : null,
    requests: sortByDate(requests).map((order) => toTgOrderRow(order, 'provider')),
    requestCount: requests.length,
    upcoming,
    todayCount: scheduled.filter((order) => tgWhenParts(dateInput(order.scheduledFor), now)?.day === 'Hoje')
      .length,
  };
}

function providerStep(order: TgAppointmentSource): boolean {
  return tgOrderNextStep({ id: order.id, status: order.status }, 'provider') !== null;
}

/** Data marcada, a mais próxima primeiro; sem data no fim; empate mantém a ordem original. */
function sortByDate<T extends TgAppointmentSource>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, time: timeOf(item.scheduledFor) }))
    .sort((a, b) => {
      if (a.time === null || b.time === null) {
        return a.time === b.time ? a.index - b.index : a.time === null ? 1 : -1;
      }
      return a.time - b.time || a.index - b.index;
    })
    .map(({ item }) => item);
}

function dateInput(value: unknown): string | number | Date | null {
  return typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
}

function timeOf(value: unknown): number | null {
  const input = dateInput(value);
  if (input === null || input === '') return null;
  const time = new Date(input).getTime();
  return Number.isFinite(time) ? time : null;
}
