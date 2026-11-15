import { type TgOrderSource, tgOrderAmount, toTgOrderRow } from '../order-row/tg-order-row.mapper';
import { toNumber } from '../provider-card/tg-provider';
import type { TgOrderPerspective } from '../order-row/tg-order-status';
import type { TgAppointmentData } from './tg-appointment-card.component';

/** O pedido da API com o que o card usa além da linha: endereço completo, foto e distância. */
export interface TgAppointmentSource extends TgOrderSource {
  /**
   * Distância até o endereço, quando a resposta traz. Hoje só o detalhe do
   * pedido (GET /orders/:id, para o prestador) tem; as listagens não.
   */
  distanceKm?: unknown;
  client?: { name?: string | null; photoUrl?: string | null } | null;
  service?: {
    title?: string | null;
    provider?: { user?: { name?: string | null; photoUrl?: string | null } | null } | null;
  } | null;
  addressSnap?: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
  } | null;
}

/**
 * Converte o pedido da API nos dados do card: tudo o que `toTgOrderRow`
 * converte (avaliação, pagamento, pessoa, valor) mais a foto da outra pessoa
 * e o endereço "Rua, número, complemento", a distância (só se a entrada
 * trouxer um número válido; nunca calculada nem inventada) e a origem do
 * valor (estimado ou final).
 */
export function toTgAppointment(order: TgAppointmentSource, perspective: TgOrderPerspective): TgAppointmentData {
  const photo = perspective === 'customer' ? order.service?.provider?.user?.photoUrl : order.client?.photoUrl;
  const { street, number, complement } = order.addressSnap ?? {};
  const address = [street, number, complement].map((part) => part?.trim()).filter(Boolean).join(', ');
  const amount = tgOrderAmount(order);
  return {
    ...toTgOrderRow(order, perspective),
    personPhotoUrl: photo?.trim() || null,
    address: address || null,
    distanceKm: toDistance(order.distanceKm),
    amount: amount?.value ?? null,
    amountKind: amount?.kind ?? null,
  };
}

/** Distância real da entrada: número finito e >= 0. Senão, null (o card não mostra). */
function toDistance(value: unknown): number | null {
  const n = toNumber(value);
  return n !== undefined && n >= 0 ? n : null;
}
