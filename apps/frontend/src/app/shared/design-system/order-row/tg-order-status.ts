import type { TgIconName } from '@taskgo/icons';
import type { TgBadgeTone } from '../badge/tg-badge.component';

/** Status do pedido no backend (enum OrderStatus do Prisma). */
export const TG_ORDER_STATUSES = [
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
  'AGENDADO',
  'EM_DESLOCAMENTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONFIRMACAO_CLIENTE',
  'CONCLUIDO',
  'DISPUTA',
  'REJEITADO',
  'CANCELADO',
] as const;

export type TgOrderStatusCode = (typeof TG_ORDER_STATUSES)[number];
/** Quem está vendo o pedido: o texto do status muda (o tom, não). */
export type TgOrderPerspective = 'customer' | 'provider';

export interface TgOrderStatusInfo {
  label: string;
  tone: TgBadgeTone;
}

/**
 * Mapa aprovado na Etapa 7 (README, Badge de status). Os textos do cliente
 * são os do app. Status novo entra aqui, nunca com cor nova.
 */
const MAP: Record<TgOrderStatusCode, { customer: string; provider: string; tone: TgBadgeTone }> = {
  AGUARDANDO_APROVACAO: { customer: 'Aguardando o profissional', provider: 'Aguardando sua resposta', tone: 'waiting' },
  AGUARDANDO_PAGAMENTO: { customer: 'Aguardando pagamento', provider: 'Aguardando pagamento', tone: 'waiting' },
  AGENDADO: { customer: 'Agendado', provider: 'Agendado', tone: 'confirmed' },
  EM_DESLOCAMENTO: { customer: 'Profissional a caminho', provider: 'A caminho', tone: 'progress' },
  EM_ANDAMENTO: { customer: 'Em andamento', provider: 'Em andamento', tone: 'progress' },
  AGUARDANDO_CONFIRMACAO_CLIENTE: { customer: 'Aguardando sua confirmação', provider: 'Aguardando o cliente', tone: 'waiting' },
  CONCLUIDO: { customer: 'Concluído', provider: 'Concluído', tone: 'done' },
  DISPUTA: { customer: 'Em análise', provider: 'Em análise', tone: 'waiting' },
  REJEITADO: { customer: 'Recusado', provider: 'Recusado', tone: 'cancelled' },
  CANCELADO: { customer: 'Cancelado', provider: 'Cancelado', tone: 'cancelled' },
};

const UNKNOWN: TgOrderStatusInfo = { label: 'Em atualização', tone: 'neutral' };

export function isTgOrderStatus(status: unknown): status is TgOrderStatusCode {
  return typeof status === 'string' && Object.prototype.hasOwnProperty.call(MAP, status);
}

/** Texto e tom do status para quem está vendo. Desconhecido: "Em atualização", nunca o código cru. */
export function tgOrderStatus(status: unknown, perspective: TgOrderPerspective): TgOrderStatusInfo {
  if (!isTgOrderStatus(status)) return UNKNOWN;
  const entry = MAP[status];
  return { label: perspective === 'provider' ? entry.provider : entry.customer, tone: entry.tone };
}

const ICONS: Record<TgOrderStatusCode, TgIconName> = {
  AGUARDANDO_APROVACAO: 'hourglass',
  AGUARDANDO_PAGAMENTO: 'wallet',
  AGENDADO: 'calendar-blank',
  EM_DESLOCAMENTO: 'map-pin',
  EM_ANDAMENTO: 'wrench',
  AGUARDANDO_CONFIRMACAO_CLIENTE: 'hourglass',
  CONCLUIDO: 'check',
  DISPUTA: 'warning-circle',
  REJEITADO: 'x',
  CANCELADO: 'x',
};

/**
 * O ícone do status, o mesmo em todo lugar que mostrar ícone (o card de
 * agendamento; a linha de pedido fica só com texto). Desconhecido: null.
 */
export function tgOrderStatusIcon(status: unknown): TgIconName | null {
  return isTgOrderStatus(status) ? ICONS[status] : null;
}

/** Mudança de status que a própria linha pede (a tela chama a API). */
export type TgOrderStatusAction = 'EM_DESLOCAMENTO' | 'EM_ANDAMENTO';

export type TgOrderNextStep =
  | { label: string; link: readonly string[]; action?: undefined }
  | { label: string; action: TgOrderStatusAction; link?: undefined };

/**
 * Status do pagamento (enum PaymentStatus do backend) em que o cliente ainda
 * age: CREATED (o pedido nasce com ele; "Pagar" cria a cobrança) e PENDENTE
 * (PIX gerado, falta pagar: "Ver QR Code"). Em qualquer outro, inclusive
 * autorizado, pago, falho, cancelado ou desconhecido, a API não aceita uma
 * nova cobrança, então a linha não oferece pagamento e leva ao pedido.
 */
function paymentStep(id: string, paymentStatus: string | null | undefined): TgOrderNextStep | null {
  const link = ['/orders', id, 'payment'] as const;
  if (paymentStatus == null || paymentStatus === '' || paymentStatus === 'CREATED') return { label: 'Pagar', link };
  if (paymentStatus === 'PENDENTE') return { label: 'Ver QR Code', link };
  return null;
}

/** O que o próximo passo precisa saber do pedido. */
export interface TgOrderStepInput {
  id: string;
  status: unknown;
  /** O cliente já avaliou (tira o "Avaliar"). */
  reviewed?: boolean | null;
  /** Status do pagamento (PaymentStatus). Sem valor: pagamento ainda não iniciado. */
  paymentStatus?: string | null;
}

/**
 * O próximo passo de quem está vendo, quando é a vez dessa pessoa. No
 * máximo um. Links levam à tela do passo; "Estou a caminho" e "Iniciar
 * serviço" são pedidos de troca de status que a tela executa.
 *
 * Pagamento: só em AGUARDANDO_PAGAMENTO. O backend só passa o pedido para
 * AGENDADO com o pagamento pago e o devolve para AGUARDANDO_PAGAMENTO se o
 * pagamento deixar de valer, então AGENDADO não pede pagamento.
 */
export function tgOrderNextStep(order: TgOrderStepInput, perspective: TgOrderPerspective): TgOrderNextStep | null {
  const { id, status } = order;
  if (perspective === 'customer') {
    switch (status) {
      case 'AGUARDANDO_PAGAMENTO':
        return paymentStep(id, order.paymentStatus);
      case 'AGUARDANDO_CONFIRMACAO_CLIENTE':
        return { label: 'Confirmar conclusão', link: ['/orders', id, 'confirm'] };
      case 'CONCLUIDO':
        return order.reviewed ? null : { label: 'Avaliar', link: ['/orders', id, 'review'] };
      default:
        return null;
    }
  }
  switch (status) {
    case 'AGUARDANDO_APROVACAO':
      return { label: 'Responder', link: ['/orders', id] };
    case 'AGENDADO':
      return { label: 'Estou a caminho', action: 'EM_DESLOCAMENTO' };
    case 'EM_DESLOCAMENTO':
      return { label: 'Iniciar serviço', action: 'EM_ANDAMENTO' };
    case 'EM_ANDAMENTO':
      return { label: 'Finalizar serviço', link: ['/orders', id, 'finish'] };
    default:
      return null;
  }
}
