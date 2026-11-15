import { type TgOrderSource, toTgOrderRow } from '../order-row/tg-order-row.mapper';
import type { TgOrderPerspective } from '../order-row/tg-order-status';
import type { TgAppointmentData } from './tg-appointment-card.component';

/** O pedido da API com o que o card usa além da linha: endereço completo e foto. */
export interface TgAppointmentSource extends TgOrderSource {
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
 * e o endereço "Rua, número, complemento".
 */
export function toTgAppointment(order: TgAppointmentSource, perspective: TgOrderPerspective): TgAppointmentData {
  const photo = perspective === 'customer' ? order.service?.provider?.user?.photoUrl : order.client?.photoUrl;
  const { street, number, complement } = order.addressSnap ?? {};
  const address = [street, number, complement].map((part) => part?.trim()).filter(Boolean).join(', ');
  return {
    ...toTgOrderRow(order, perspective),
    personPhotoUrl: photo?.trim() || null,
    address: address || null,
  };
}
