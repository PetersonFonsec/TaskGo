import type { TgIconName } from '@taskgo/icons';
import { tgMoney } from '@shared/design-system/order-row/tg-order-format';
import type { ProviderHomeData, RevenueByMonth } from './data';

export interface ProviderHomeKpi {
  id: 'today' | 'month' | 'services' | 'rating';
  icon: TgIconName;
  label: string;
  value: string;
  description: string;
  /** Crescimento: a descrição vai na cor de sucesso. */
  positive: boolean;
}

export interface ProviderHomeRecent {
  id: string;
  service: string;
  person: string | null;
  /** "02 nov" (com o ano se não for o atual); sem data válida, null. */
  date: string | null;
  /** "Você recebeu R$ 72": a parte do prestador. Sem valor (> 0), null. */
  received: string | null;
  /** Nota de 1 a 5; sem avaliação, null. */
  rating: number | null;
}

export interface ProviderHomeInsight {
  label: string;
  value: string;
  positive: boolean;
}

export interface ProviderHomeEarnings {
  kpis: ProviderHomeKpi[];
  revenue: RevenueByMonth[];
  recent: ProviderHomeRecent[];
  insights: ProviderHomeInsight[];
}

const BRL_INT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const ONE_DECIMAL = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Os rótulos do gráfico (backend: "Jan" a "Dez") por extenso, para "em relação a outubro". */
const MONTH_NAMES: Record<string, string> = {
  Jan: 'janeiro',
  Fev: 'fevereiro',
  Mar: 'março',
  Abr: 'abril',
  Mai: 'maio',
  Jun: 'junho',
  Jul: 'julho',
  Ago: 'agosto',
  Set: 'setembro',
  Out: 'outubro',
  Nov: 'novembro',
  Dez: 'dezembro',
};

/**
 * Os números do painel (`/auth/provider-home`) prontos para a tela: os 4
 * indicadores, o gráfico, os últimos serviços e os insights. Os mesmos
 * números da tela antiga; nada é calculado além de formatar e do
 * crescimento do mês, que já era calculado aqui. Campos ausentes ou
 * inválidos viram zero ou "Sem dados", nunca valor inventado.
 */
export function providerHomeEarnings(home: ProviderHomeData, now: Date = new Date()): ProviderHomeEarnings {
  const earnings = home.earnings ?? { today: 0, month: 0, previousMonth: 0, lastSixMonths: [] };
  const revenue = Array.isArray(earnings.lastSixMonths) ? earnings.lastSixMonths : [];
  const month = amount(earnings.month);
  const previous = amount(earnings.previousMonth);
  const growth = previous > 0 ? ((month - previous) / previous) * 100 : null;
  const previousName = MONTH_NAMES[revenue.at(-2)?.month ?? ''];
  const completed = count(home.services?.completedTotal);
  const thisWeek = count(home.services?.completedThisWeek);
  const ratingCount = count(home.rating?.count);
  const ratingAvg = amount(home.rating?.average);

  const kpis: ProviderHomeKpi[] = [
    {
      id: 'today',
      icon: 'wallet',
      label: 'Ganhos hoje',
      value: BRL_INT.format(amount(earnings.today)),
      description: 'Sua parte dos serviços pagos hoje',
      positive: false,
    },
    {
      id: 'month',
      icon: 'receipt',
      label: 'Ganhos do mês',
      value: BRL_INT.format(month),
      description:
        growth === null
          ? 'Sem histórico do mês anterior'
          : `${signed(growth)} em relação ${previousName ? `a ${previousName}` : 'ao mês passado'}`,
      positive: growth !== null && growth > 0,
    },
    {
      id: 'services',
      icon: 'check',
      label: 'Serviços concluídos',
      value: String(completed),
      description: `${thisWeek} nesta semana`,
      positive: false,
    },
    {
      id: 'rating',
      icon: 'star',
      label: 'Avaliação',
      value: ratingCount > 0 ? ONE_DECIMAL.format(ratingAvg) : 'Sem notas',
      description:
        ratingCount > 0
          ? `Com base em ${ratingCount} ${ratingCount === 1 ? 'avaliação' : 'avaliações'}`
          : 'Nenhuma avaliação ainda',
      positive: false,
    },
  ];

  const recent: ProviderHomeRecent[] = (Array.isArray(home.recentServices) ? home.recentServices : []).map(
    (service) => ({
      id: String(service.id),
      service: service.service?.trim() || 'Serviço',
      person: service.clientName?.trim() || null,
      date: shortDate(service.completedAt, now),
      received: received(service.amount),
      rating: validRating(service.rating),
    }),
  );

  const insights = home.insights;
  const ticket = amount(insights?.averageTicket);
  const monthlyGrowth = insights?.monthlyGrowth;
  return {
    kpis,
    revenue,
    recent,
    insights: [
      { label: 'Serviço mais pedido', value: insights?.mostRequestedService?.trim() || 'Sem dados', positive: false },
      { label: 'Ticket médio', value: ticket > 0 ? BRL_INT.format(ticket) : 'Sem dados', positive: false },
      { label: 'Bairro mais atendido', value: insights?.mostServedNeighborhood?.trim() || 'Sem dados', positive: false },
      {
        label: 'Crescimento no mês',
        value: isNumber(monthlyGrowth) ? signed(monthlyGrowth) : 'Sem histórico',
        positive: isNumber(monthlyGrowth) && monthlyGrowth > 0,
      },
    ],
  };
}

function received(value: unknown): string | null {
  const money = tgMoney(isNumber(value) ? value : null);
  return money ? `Você recebeu ${money}` : null;
}

function validRating(value: unknown): number | null {
  return isNumber(value) && value >= 1 && value <= 5 ? value : null;
}

/** "02 nov", ou "02 nov 2025" se não for o ano atual. Data local de quem vê. */
function shortDate(value: unknown, now: Date): string | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${day} ${MONTHS[date.getMonth()]}${year}`;
}

/** "+12%" ou "-5%". */
function signed(percent: number): string {
  const rounded = Math.round(percent);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function amount(value: unknown): number {
  return isNumber(value) && value > 0 ? value : 0;
}

function count(value: unknown): number {
  return isNumber(value) && value > 0 ? Math.trunc(value) : 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
