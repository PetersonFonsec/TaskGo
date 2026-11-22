import type { TgIconName } from '@taskgo/icons';
import type { TgBadgeTone } from '@shared/design-system/badge/tg-badge.component';
import { tgOrderStatus, tgOrderStatusIcon } from '@shared/design-system/order-row/tg-order-status';
import type { OrderDetails } from '@shared/service/order/order.model';
import { PAYMENT_METHODS, PAYMENT_STATUSES } from '../order-details/order-details.view';

/** O único status em que a API aceita a confirmação (ConfirmOrderCompletionHandler). */
export const AWAITING_CONFIRMATION = 'AGUARDANDO_CONFIRMACAO_CLIENTE';

const TIME_ZONE = 'America/Sao_Paulo';
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const ONE_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const DATE = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: TIME_ZONE });
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE });

const PHOTO_TYPES: Record<string, string> = {
  BEFORE: 'Antes',
  AFTER: 'Depois',
  RECEIPT: 'Comprovante',
  DAMAGE: 'Avaria',
};

export interface ConfirmServiceRow {
  label: string;
  value: string;
}

export interface ConfirmServiceView {
  id: string;
  title: string;
  /** "Pedido #1042 · Elétrica". */
  eyebrow: string;
  status: { label: string; tone: TgBadgeTone; icon: TgIconName | null };
  provider: {
    name: string;
    photoUrl: string | null;
    initials: string;
    verified: boolean;
    /** "4,8 (32 avaliações)"; sem avaliação, null. */
    rating: string | null;
  };
  /** Agendamento, endereço e quando o prestador finalizou; só o que veio. */
  details: ConfirmServiceRow[];
  /** Observações do prestador na finalização. */
  notes: string | null;
  /** Valor estimado, final e a diferença (só quando muda). */
  prices: ConfirmServiceRow[];
  /** Valor final que a confirmação libera. */
  finalPrice: string;
  /** Forma e situação do pagamento. */
  payment: ConfirmServiceRow[];
  photos: { id: string; url: string; label: string }[];
}

/** O pedido (GET /orders/:id) pronto para a confirmação do cliente. */
export function confirmServiceView(order: OrderDetails): ConfirmServiceView {
  const status = tgOrderStatus(order.status, 'customer');
  const category = order.service?.category?.trim();
  const estimated = money(order.payment?.estimatedAmount) ?? money(order.service?.estimatedPrice);
  // O preço combinado permanece fixo durante o atendimento; `finalAmount`
  // não deve criar uma experiência de ajuste no cliente.
  const final = estimated ?? money(order.payment?.finalAmount);
  const name = order.provider?.name?.trim() || 'Prestador';
  const count = Number(order.provider?.ratingCount);
  const avg = Number(order.provider?.ratingAvg);

  const prices: ConfirmServiceRow[] = [];
  if (estimated !== null) prices.push({ label: 'Valor estimado', value: BRL.format(estimated) });

  const payment: ConfirmServiceRow[] = [];
  if (order.payment) {
    const method = PAYMENT_METHODS[order.payment.method];
    if (method) payment.push({ label: 'Forma de pagamento', value: method });
    payment.push({ label: 'Situação do pagamento', value: PAYMENT_STATUSES[order.payment.status] ?? 'Em atualização' });
  }

  return {
    id: order.id,
    title: order.service?.title?.trim() || 'Serviço',
    eyebrow: [`Pedido #${order.id}`, category].filter(Boolean).join(' · '),
    status: { ...status, icon: tgOrderStatusIcon(order.status) },
    provider: {
      name,
      photoUrl: order.provider?.photoUrl?.trim() || null,
      initials: initials(name),
      verified: order.provider?.verified === true,
      rating:
        Number.isFinite(count) && count > 0 && Number.isFinite(avg) && avg > 0
          ? `${ONE_DECIMAL.format(avg)} (${count} ${count === 1 ? 'avaliação' : 'avaliações'})`
          : null,
    },
    details: [
      row('Agendamento', dateTime(order.schedule?.scheduledFor)),
      row('Endereço', address(order)),
      row('Conclusão informada em', dateTime(order.completion?.providerFinishedAt)),
    ].filter((item): item is ConfirmServiceRow => item !== null),
    notes: order.completion?.providerNotes?.trim() || null,
    prices,
    finalPrice: final !== null ? BRL.format(final) : 'A definir',
    payment,
    photos: (Array.isArray(order.photos) ? order.photos : [])
      .filter((photo) => !!photo?.url?.trim())
      .map((photo) => ({ id: photo.id, url: photo.url, label: PHOTO_TYPES[photo.type] ?? 'Foto' })),
  };
}

/** "12 de novembro de 2026 às 14:00", no horário de Brasília. Data inválida: null. */
export function dateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${DATE.format(date)} às ${TIME.format(date)}`;
}

function address(order: OrderDetails): string | null {
  const a = order.address;
  if (!a) return null;
  const street = [a.street, a.number, a.complement].map((part) => part?.trim()).filter(Boolean).join(', ');
  const city = [a.city?.trim(), a.state?.trim()].filter(Boolean).join(' / ');
  return [street, a.neighborhood?.trim(), city].filter(Boolean).join(' · ') || null;
}

function row(label: string, value: string | null): ConfirmServiceRow | null {
  return value ? { label, value } : null;
}

function money(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? '').join('');
}
