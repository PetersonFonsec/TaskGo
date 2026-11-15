import type { ProviderHomeData } from './data';
import { providerHomeEarnings } from './provider-home.earnings';

const NOW = new Date('2026-11-18T12:00:00');
/** O Intl separa "R$" do número com espaço não separável; os textos esperados usam espaço comum. */
const plain = (value: string | null) => value?.replace(/\u00a0/g, ' ') ?? null;

function data(extra: Partial<ProviderHomeData> = {}): ProviderHomeData {
  return {
    earnings: {
      today: 180,
      month: 3240,
      previousMonth: 2900,
      lastSixMonths: [
        { month: 'Out', revenue: 2900 },
        { month: 'Nov', revenue: 3240 },
      ],
    },
    services: { completedTotal: 48, completedThisWeek: 3 },
    rating: { average: 4.9, count: 37 },
    pendingRequests: [],
    recentServices: [],
    insights: { mostRequestedService: null, averageTicket: 0, mostServedNeighborhood: null, monthlyGrowth: null },
    ...extra,
  };
}

describe('providerHomeEarnings', () => {
  it('formata os 4 indicadores', () => {
    const { kpis } = providerHomeEarnings(data(), NOW);
    expect(kpis.map((k) => [k.label, plain(k.value), k.description, k.positive])).toEqual([
      ['Ganhos hoje', 'R$ 180', 'Sua parte dos serviços pagos hoje', false],
      ['Ganhos do mês', 'R$ 3.240', '+12% em relação a outubro', true],
      ['Serviços concluídos', '48', '3 nesta semana', false],
      ['Avaliação', '4,9', 'Com base em 37 avaliações', false],
    ]);
  });

  it('sem mês anterior não inventa crescimento; queda não fica em verde', () => {
    expect(providerHomeEarnings(data({ earnings: { today: 0, month: 10, previousMonth: 0, lastSixMonths: [] } }), NOW)
      .kpis[1].description).toBe('Sem histórico do mês anterior');
    const down = providerHomeEarnings(
      data({ earnings: { today: 0, month: 90, previousMonth: 100, lastSixMonths: [] } }),
      NOW,
    ).kpis[1];
    expect(down.description).toBe('-10% em relação ao mês passado');
    expect(down.positive).toBeFalse();
  });

  it('sem avaliações, não mostra nota zero', () => {
    const rating = providerHomeEarnings(data({ rating: { average: 0, count: 0 } }), NOW).kpis[3];
    expect(rating.value).toBe('Sem notas');
    expect(rating.description).toBe('Nenhuma avaliação ainda');
    expect(providerHomeEarnings(data({ rating: { average: 5, count: 1 } }), NOW).kpis[3].description).toBe(
      'Com base em 1 avaliação',
    );
  });

  it('últimos serviços: o que o prestador recebeu, a data curta e a nota', () => {
    const { recent } = providerHomeEarnings(
      data({
        recentServices: [
          { id: '1', clientName: ' Carlos Lima ', service: 'Conserto', completedAt: '2026-11-02T15:00:00', amount: 72, rating: 5 },
          { id: '2', clientName: '', service: '', completedAt: '2025-12-30T15:00:00', amount: 0, rating: null },
          { id: '3', clientName: 'X', service: 'Y', completedAt: 'inválida', amount: 99.5, rating: 9 },
        ],
      }),
      NOW,
    );
    expect(recent.map((r) => ({ ...r, received: plain(r.received) }))).toEqual([
      { id: '1', service: 'Conserto', person: 'Carlos Lima', date: '02 nov', received: 'Você recebeu R$ 72', rating: 5 },
      { id: '2', service: 'Serviço', person: null, date: '30 dez 2025', received: null, rating: null },
      { id: '3', service: 'Y', person: 'X', date: null, received: 'Você recebeu R$ 99,50', rating: null },
    ]);
  });

  it('insights com "Sem dados" quando o painel não tem', () => {
    expect(providerHomeEarnings(data(), NOW).insights.map((i) => i.value)).toEqual([
      'Sem dados',
      'Sem dados',
      'Sem dados',
      'Sem histórico',
    ]);
    const filled = providerHomeEarnings(
      data({
        insights: { mostRequestedService: 'Limpeza', averageTicket: 165.4, mostServedNeighborhood: 'Pinheiros', monthlyGrowth: 12.4 },
      }),
      NOW,
    ).insights;
    expect(filled.map((i) => plain(i.value))).toEqual(['Limpeza', 'R$ 165', 'Pinheiros', '+12%']);
    expect(filled[3].positive).toBeTrue();
  });

  it('campos ausentes viram zero, sem quebrar', () => {
    const broken = { insights: null } as unknown as ProviderHomeData;
    const result = providerHomeEarnings(broken, NOW);
    expect(plain(result.kpis[0].value)).toBe('R$ 0');
    expect(result.revenue).toEqual([]);
    expect(result.recent).toEqual([]);
  });
});
