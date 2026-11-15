/**
 * Dados que o card de prestador mostra. Só dados reais: o que não vier fica
 * de fora do card (sem nota, distância ou preço inventados).
 */
export interface TgProvider {
  id: string;
  name: string;
  photoUrl?: string | null;
  verified?: boolean;
  /** Nota média de 0 a 5. Sem avaliações (ou sem nota), o card mostra "Novo no TaskGo". */
  rating?: number | null;
  ratingCount?: number | null;
  /** Serviço principal, ou o que casou com a busca. */
  service?: string | null;
  /** Preço base, em reais. Sem valor, o card mostra "Preço sob consulta". */
  priceFrom?: number | null;
  /** Distância calculada pela busca. Sem valor, a distância não aparece. */
  distanceKm?: number | null;
}

/** Decimal do Prisma serializado como objeto (decimal.js: sinal, expoente e dígitos em base 1e7). */
interface DecimalParts {
  s: number;
  e: number;
  d: number[];
}

/**
 * Converte o prestador como vem da API (busca, categoria) para o card.
 * Aceita os formatos que a busca já trata: dados no prestador ou no usuário,
 * nota como número, texto ou Decimal, e preço no primeiro serviço.
 * Devolve `null` quando não há id, porque sem id não há link para o perfil.
 */
export function toTgProvider(source: unknown): TgProvider | null {
  if (!source || typeof source !== 'object') return null;
  const p = source as Record<string, any>;
  const user = obj(p['user']);
  const profile = obj(user['provider']);
  const service = obj(Array.isArray(p['services']) ? p['services'][0] : undefined);

  const id = p['id'] ?? p['providerId'] ?? user['id'];
  if (id == null || id === '') return null;

  return {
    id: String(id),
    name: text(user['name']) ?? text(p['name']) ?? 'Profissional',
    photoUrl: text(user['photoUrl']) ?? text(p['photoUrl']) ?? null,
    verified: !!(p['verified'] ?? profile['verified']),
    rating: toNumber(p['ratingAvg'] ?? p['rating'] ?? profile['ratingAvg']) ?? null,
    ratingCount: toNumber(p['ratingCount'] ?? profile['ratingCount']) ?? null,
    service: text(service['title']) ?? text(service['name']) ?? text(p['service']) ?? text(p['serviceName']) ?? null,
    priceFrom: toNumber(p['priceFrom'] ?? service['basePrice'] ?? service['price']) ?? null,
    distanceKm: toNumber(p['distanceKm'] ?? p['distance']) ?? null,
  };
}

/** Número finito a partir de número, texto numérico ou Decimal; senão `undefined`. */
export function toNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const n = Number(value.trim());
    return value.trim() !== '' && Number.isFinite(n) ? n : undefined;
  }
  if (isDecimal(value)) {
    const digits = value.d.map((chunk, i) => (i === 0 ? String(chunk) : String(chunk).padStart(7, '0'))).join('');
    const n = Number(`${digits[0]}.${digits.slice(1) || '0'}e${value.e}`) * (value.s < 0 ? -1 : 1);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function isDecimal(value: unknown): value is DecimalParts {
  const v = value as DecimalParts;
  return (
    typeof v === 'object' &&
    Array.isArray(v.d) &&
    v.d.length > 0 &&
    v.d.every((c) => Number.isInteger(c) && c >= 0) &&
    Number.isInteger(v.e) &&
    (v.s === 1 || v.s === -1)
  );
}

function obj(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}
