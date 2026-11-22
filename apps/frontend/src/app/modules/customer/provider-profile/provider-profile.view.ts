import { toNumber, toTgProvider } from '@shared/design-system/provider-card/tg-provider';

/** Um serviço ativo do perfil. */
export interface ProviderProfileServiceView {
  id: string;
  title: string;
  description: string | null;
  /** "R$ 120" ou "R$ 89,90"; sem preço válido, `null` ("Preço sob consulta"). */
  price: string | null;
}

/** Uma avaliação: nota inteira de 1 a 5, data e comentário. */
export interface ProviderProfileReviewView {
  id: string;
  rating: number;
  /** "Nota 5 de 5", para leitor de tela. */
  ratingLabel: string;
  /** "12 de nov. de 2026", no horário de São Paulo. */
  date: string | null;
  comment: string | null;
}

export interface ProviderProfileView {
  /** Id do Provider (o mesmo do usuário: 1:1, mesma chave). */
  id: string;
  name: string;
  photoUrl: string | null;
  initials: string;
  verified: boolean;
  bio: string | null;
  /** Nota de 1 a 5 com contagem inteira positiva; senão `null` ("Novo no TaskGo"). */
  rating: { value: string; count: string; label: string } | null;
  /** "novembro de 2025". */
  memberSince: string | null;
  services: ProviderProfileServiceView[];
  reviews: ProviderProfileReviewView[];
  /** A API traz só as 20 avaliações mais recentes; `true` quando há mais do que as mostradas. */
  moreReviews: boolean;
  /** Região aproximada de cobertura (sem expor coordenadas nem endereço residencial). */
  region: string | null;
  acceptsPix: boolean;
  acceptsCard: boolean;
  emergencyCare: boolean;
  available24h: boolean;
}

const TIME_ZONE = 'America/Sao_Paulo';
const ONE_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const COUNT = new Intl.NumberFormat('pt-BR');
const PRICE = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PRICE_INT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: TIME_ZONE });
const DAY = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });

/**
 * Converte `GET /provider/:id` (backend: `GetProviderHandler`, com
 * `publicProviderSelect`, `createdAt` e as 20 avaliações mais recentes) para
 * a tela. A API devolve `null` quando o prestador não existe, não está
 * aprovado ou não tem serviço ativo; aqui, sem id válido, também `null`.
 *
 * Só dados reais: sem apresentação, sem nota ou sem data, a parte some (nada
 * de "0,0" nem texto fixo no lugar).
 */
export function providerProfileView(source: unknown): ProviderProfileView | null {
  const card = toTgProvider(source);
  if (!card || !isRecord(source)) return null;

  const rating = ratingOf(card.rating, card.ratingCount);
  const reviews = list(source['reviews']).map(toReview).filter((r): r is ProviderProfileReviewView => !!r);
  const count = card.ratingCount != null && Number.isSafeInteger(card.ratingCount) ? card.ratingCount : 0;

  return {
    id: card.id,
    name: card.name,
    photoUrl: card.photoUrl?.trim() || null,
    initials: initials(card.name),
    verified: !!card.verified,
    bio: text(source['bio']),
    rating,
    memberSince: formatDate(source['createdAt'], MONTH_YEAR),
    services: list(source['services'])
      .filter((s) => s['status'] == null || s['status'] === 'ATIVO')
      .map(toService)
      .filter((s): s is ProviderProfileServiceView => !!s)
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    reviews,
    moreReviews: count > reviews.length,
    region: regionOf(source['serviceAreas']),
    acceptsPix: source['acceptPix'] === true,
    acceptsCard: source['acceptsCard'] === true,
    emergencyCare: source['emergencyCare'] === true,
    available24h: source['isAvailable24h'] === true,
  };
}

function regionOf(value: unknown): string | null {
  const areas = list(value);
  const radii = areas
    .filter((area) => area['mode'] === 'RADIUS')
    .map((area) => toNumber(area['radiusKm']))
    .filter((radius): radius is number => radius !== null && radius > 0);
  if (radii.length) {
    const radius = Math.max(...radii);
    const formatted = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(radius);
    return `Atende em um raio de até ${formatted} km da base cadastrada.`;
  }
  return areas.some((area) => area['mode'] === 'POLYGON') ? 'Atende na área delimitada no mapa.' : null;
}

/** Mesma regra do card de prestador: média de 1 a 5 e contagem inteira positiva. */
function ratingOf(rating: number | null | undefined, ratingCount: number | null | undefined) {
  if (rating == null || ratingCount == null) return null;
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return null;
  if (!Number.isSafeInteger(ratingCount) || ratingCount < 1) return null;
  const value = ONE_DECIMAL.format(rating);
  const count = COUNT.format(ratingCount);
  return {
    value,
    count,
    label: `Nota ${value} de 5, ${count} ${ratingCount === 1 ? 'avaliação' : 'avaliações'}`,
  };
}

function toService(service: Record<string, unknown>): ProviderProfileServiceView | null {
  const title = text(service['title']);
  if (!title) return null;
  const price = toNumber(service['basePrice']);
  return {
    id: String(service['id'] ?? title),
    title,
    description: text(service['description']),
    price: price != null && price > 0 ? (Number.isInteger(price) ? PRICE_INT : PRICE).format(price) : null,
  };
}

/** Cada avaliação é um inteiro de 1 a 5; fora disso, a avaliação não aparece. */
function toReview(review: Record<string, unknown>, index: number): ProviderProfileReviewView | null {
  const rating = toNumber(review['rating']);
  if (rating == null || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return {
    id: String(review['id'] ?? `review-${index}`),
    rating,
    ratingLabel: `Nota ${rating} de 5`,
    date: formatDate(review['reviewedAt'], DAY),
    comment: text(review['comment']),
  };
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toLocaleUpperCase('pt-BR');
}

function formatDate(value: unknown, format: Intl.DateTimeFormat): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format.format(date);
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}
