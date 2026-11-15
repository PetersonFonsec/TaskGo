// Formatação compartilhada pela linha de pedido e pelo card de agendamento.

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const KM = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL_INT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export type TgDateInput = string | number | Date | null | undefined;

export const TG_NO_DATE = 'Data a combinar';

/** Partes do dia civil num fuso (sem fuso: o do navegador). */
interface CivilDate {
  year: number;
  month: number;
  day: number;
  time: string;
}

const CIVIL = new Map<string, Intl.DateTimeFormat>();

function civilFormat(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone ?? '';
  let format = CIVIL.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    CIVIL.set(key, format);
  }
  return format;
}

function civil(date: Date, timeZone: string | undefined): CivilDate {
  const parts: Record<string, string> = {};
  for (const { type, value } of civilFormat(timeZone).formatToParts(date)) parts[type] = value;
  return { year: +parts['year'], month: +parts['month'], day: +parts['day'], time: `${parts['hour']}:${parts['minute']}` };
}

/** Número do dia civil: a diferença entre dois é sempre inteira, com ou sem horário de verão. */
function dayNumber({ year, month, day }: CivilDate): number {
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function toDate(value: TgDateInput): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * O dia e a hora separados: { day: 'Hoje', time: '14:00' }, ou
 * { day: 'Ter, 18 nov', time: '09:00' } (com o ano se não for o atual).
 * Compara dias civis (não 24 h), então dias de 23 ou 25 h no horário de
 * verão não mudam a conta. `timeZone` (IANA) é o fuso de quem vê; sem ele, o
 * do navegador. Sem data válida: null.
 */
export function tgWhenParts(value: TgDateInput, now = new Date(), timeZone?: string): { day: string; time: string } | null {
  const date = toDate(value);
  if (!date || Number.isNaN(now.getTime())) return null;
  const target = civil(date, timeZone);
  const today = civil(now, timeZone);
  const days = dayNumber(target) - dayNumber(today);
  const time = target.time;
  if (days === 0) return { day: 'Hoje', time };
  if (days === 1) return { day: 'Amanhã', time };
  if (days === -1) return { day: 'Ontem', time };
  const weekday = new Date(Date.UTC(target.year, target.month - 1, target.day)).getUTCDay();
  const year = target.year === today.year ? '' : ` ${target.year}`;
  const day = String(target.day).padStart(2, '0');
  return { day: `${WEEKDAYS[weekday]}, ${day} ${MONTHS[target.month - 1]}${year}`, time };
}

/** "Hoje, 14:00", "Amanhã, 09:00", "Ontem, 15:00", "Ter, 18 nov, 09:00" (com o ano se não for o atual). Sem data: "Data a combinar". */
export function when(value: TgDateInput, now = new Date(), timeZone?: string): string {
  const parts = tgWhenParts(value, now, timeZone);
  return parts ? `${parts.day}, ${parts.time}` : TG_NO_DATE;
}

/** "1,2 km". Inválido ou negativo: null. */
export function tgDistance(km: number | null | undefined): string | null {
  const value = Number(km);
  if (km == null || !Number.isFinite(value) || value < 0) return null;
  return `${KM.format(value)} km`;
}

/** "R$ 180" ou "R$ 99,50". Zero, negativo ou inválido: null. */
export function tgMoney(amount: number | null | undefined): string | null {
  const value = Number(amount);
  if (amount == null || !Number.isFinite(value) || value <= 0) return null;
  return (Number.isInteger(value) ? BRL_INT : BRL).format(value);
}
