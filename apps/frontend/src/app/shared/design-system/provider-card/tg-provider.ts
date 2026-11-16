/**
 * Dados que o card de prestador mostra. Só dados reais: o que não vier fica
 * de fora do card (sem nota, distância ou preço inventados).
 */
export interface TgProvider {
  /** Id do Provider (não do usuário): é o que o perfil `/customer/:id` busca. */
  id: string;
  name: string;
  photoUrl?: string | null;
  verified?: boolean;
  /** Nota média, de 1 a 5 (cada avaliação é um inteiro de 1 a 5). Fora disso, ou sem avaliações, o card mostra "Novo no TaskGo". */
  rating?: number | null;
  ratingCount?: number | null;
  /** Título do serviço cujo preço aparece em `priceFrom`. */
  service?: string | null;
  /** Menor preço base entre os serviços elegíveis, em reais. Sem valor, "Preço sob consulta". */
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

/** Contexto da lista: na busca por categoria, só os serviços dessa categoria contam. */
export interface TgProviderContext {
  category?: string | null;
}

/**
 * Converte o prestador como vem da API para o card. O formato é o
 * `publicProviderSelect` do backend (GET /provider, /provider/by-category/:slug):
 * `id` é o id do Provider (BigInt em texto), `user` traz nome e foto, e
 * `services` traz os serviços ativos, sem ordem garantida.
 *
 * - Id: só ids do Provider (`id` ou `providerId` do prestador; num registro
 *   de usuário com `provider` aninhado, o id desse `provider`). O id do
 *   usuário nunca é usado: o perfil (`/customer/:id`) busca pelo Provider.
 *   Sem id válido (inteiro positivo), devolve `null`, porque sem id não há link.
 * - Serviço e preço: o serviço ativo de menor preço válido (empate: título,
 *   depois id), com o título e o preço desse mesmo serviço. Com `category`,
 *   só os serviços dessa categoria. A ordem da API não muda o resultado.
 * - Nota e contagem como vierem (número, texto ou Decimal); o card valida.
 */
export function toTgProvider(source: unknown, context: TgProviderContext = {}): TgProvider | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as Record<string, any>;
  const p = providerPart(record);
  const user = p !== record ? record : obj(p['user']);
  const profile = obj(user['provider']);

  const id = providerId(p['id']) ?? providerId(p['providerId']);
  if (!id) return null;

  const main = cheapestService(p['services'], context.category);

  return {
    id,
    name: text(user['name']) ?? text(p['name']) ?? 'Profissional',
    photoUrl: text(user['photoUrl']) ?? text(p['photoUrl']) ?? null,
    verified: !!(p['verified'] ?? profile['verified']),
    rating: toNumber(p['ratingAvg'] ?? p['rating'] ?? profile['ratingAvg']) ?? null,
    ratingCount: toNumber(p['ratingCount'] ?? profile['ratingCount']) ?? null,
    service: main?.title ?? null,
    priceFrom: main?.price ?? null,
    distanceKm: toNumber(p['distanceKm'] ?? p['distance']) ?? null,
  };
}

/**
 * O preço que o card mostra ("A partir de"): o do serviço elegível mais barato,
 * pela mesma regra de `toTgProvider` (ativo, da categoria pedida, preço maior
 * que zero; a ordem da API não importa). Sem preço válido, `null`.
 */
export function tgProviderPriceFrom(source: unknown, context: TgProviderContext = {}): number | null {
  if (!isObject(source)) return null;
  return cheapestService(providerPart(source as Record<string, any>)['services'], context.category)?.price ?? null;
}

/** Registro de usuário com o prestador aninhado: o prestador está em `provider`. */
function providerPart(record: Record<string, any>): Record<string, any> {
  return isObject(record['provider']) ? (record['provider'] as Record<string, any>) : record;
}

/** Id do Provider: BigInt serializado como texto de dígitos, ou inteiro positivo. */
function providerId(value: unknown): string | undefined {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : undefined;
  if (typeof value === 'bigint') return value > 0n ? value.toString() : undefined;
  if (typeof value !== 'string') return undefined;
  const id = value.trim();
  return /^[0-9]+$/.test(id) && /[1-9]/.test(id) ? id.replace(/^0+/, '') : undefined;
}

/**
 * O serviço elegível mais barato: ativo (ou sem status), da categoria pedida
 * (quando houver) e com preço finito maior que zero. Título e preço vêm do
 * mesmo serviço. Se nenhum tiver preço válido, devolve o primeiro título em
 * ordem alfabética, sem preço ("Preço sob consulta" no card).
 */
function cheapestService(
  services: unknown,
  category?: string | null,
): { title: string | null; price: number | null } | null {
  if (!Array.isArray(services)) return null;
  const wanted = text(category);
  const eligible = services
    .filter(isObject)
    .map((s) => s as Record<string, any>)
    .filter((s) => s['status'] == null || s['status'] === 'ATIVO')
    .filter((s) => !wanted || s['category'] === wanted)
    .map((s) => {
      const price = toNumber(s['basePrice']);
      return {
        title: text(s['title']) ?? null,
        price: price != null && price > 0 ? price : null,
        id: String(s['id'] ?? ''),
      };
    });
  if (!eligible.length) return null;
  const byText = (a: string | null, b: string | null) => (a ?? '\uffff').localeCompare(b ?? '\uffff', 'pt-BR');
  eligible.sort(
    (a, b) =>
      (a.price ?? Infinity) - (b.price ?? Infinity) ||
      byText(a.title, b.title) ||
      a.id.localeCompare(b.id, 'en', { numeric: true }),
  );
  const [first] = eligible;
  return { title: first.title, price: first.price };
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

function isObject(value: unknown): value is object {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function obj(value: unknown): Record<string, any> {
  return isObject(value) ? (value as Record<string, any>) : {};
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}
