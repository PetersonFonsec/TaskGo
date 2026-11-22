import type { OrderDetails } from '@shared/service/order/order.model';

/**
 * Limite do comentário, o mesmo do DTO da API (`CreateOrderReviewDto`:
 * `@MaxLength(500)` em `comment`). A API guarda o texto sem espaços nas
 * pontas, e a tela já envia assim.
 */
export const COMMENT_MAX = 500;

/** Nota de 1 a 5, inteira (`@IsInt() @Min(1) @Max(5)` no DTO). */
export const RATINGS = [
  { value: 1, label: 'Muito insatisfeito' },
  { value: 2, label: 'Insatisfeito' },
  { value: 3, label: 'Regular' },
  { value: 4, label: 'Bom atendimento' },
  { value: 5, label: 'Excelente atendimento' },
] as const;

/**
 * Se o pedido pode ser avaliado por quem está logado, com as mesmas regras
 * da API (`create-order-review.handler.ts`): só o cliente do pedido, só
 * concluído e só uma vez.
 *
 * - `open`: pode avaliar.
 * - `reviewed`: já tem avaliação.
 * - `notOwner`: o pedido é de outra conta.
 * - `notFinished`: o atendimento ainda está em curso.
 * - `closed`: cancelado, recusado, em disputa ou num status desconhecido.
 */
export type ReviewAvailability = 'open' | 'reviewed' | 'notOwner' | 'notFinished' | 'closed';

const IN_PROGRESS = new Set([
  'AGUARDANDO_APROVACAO',
  'AGUARDANDO_PAGAMENTO',
  'AGENDADO',
  'EM_DESLOCAMENTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_CONFIRMACAO_CLIENTE',
]);

export function reviewAvailability(order: OrderDetails, userId: string | null): ReviewAvailability {
  if (!userId || userId !== String(order.client?.id)) return 'notOwner';
  if (order.review) return 'reviewed';
  if (order.status === 'CONCLUIDO') return 'open';
  return IN_PROGRESS.has(order.status) ? 'notFinished' : 'closed';
}

/** Mensagens de validação, na ordem dos campos. Vazias: válido. */
export function reviewErrors(rating: number, comment: string): { rating: string; comment: string } {
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5;
  return {
    rating: validRating ? '' : 'Escolha uma nota de 1 a 5 estrelas.',
    comment:
      comment.trim().length > COMMENT_MAX
        ? `Use no máximo ${COMMENT_MAX} caracteres no comentário.`
        : '',
  };
}

export function ratingLabel(rating: number): string {
  return RATINGS.find((option) => option.value === rating)?.label ?? '';
}

export interface ReviewSummary {
  providerName: string;
  initials: string;
  photoUrl: string | null;
  service: string;
  /** Dia em que o prestador finalizou (ou o agendado), em São Paulo. */
  doneOn: string | null;
  amount: string | null;
}

const DAY = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});
const MONEY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function reviewSummary(order: OrderDetails): ReviewSummary {
  const providerName = order.provider?.name?.trim() || 'Prestador';
  const date = order.completion?.providerFinishedAt || order.schedule?.scheduledFor || null;
  const parsed = date ? new Date(date) : null;
  const amount = Number(
    order.payment?.finalAmount ?? order.payment?.estimatedAmount ?? order.service?.estimatedPrice,
  );
  return {
    providerName,
    initials: initials(providerName),
    photoUrl: order.provider?.photoUrl?.trim() || null,
    service: order.service?.title?.trim() || 'Atendimento',
    doneOn: parsed && !Number.isNaN(parsed.getTime()) ? DAY.format(parsed) : null,
    amount: Number.isFinite(amount) ? MONEY.format(amount) : null,
  };
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]?.toUpperCase() ?? '').join('');
}
