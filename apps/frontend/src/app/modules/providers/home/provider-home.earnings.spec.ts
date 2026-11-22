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
    expect(recent.map((r) => ({ ...r, share: plain(r.share) }))).toEqual([
      { id: '1', service: 'Conserto', person: 'Carlos Lima', date: '02 nov', share: 'Sua parte no serviço: R$ 72', rating: 5 },
      { id: '2', service: 'Serviço', person: null, date: '30 dez 2025', share: null, rating: null },
      { id: '3', service: 'Y', person: 'X', date: null, share: 'Sua parte no serviço: R$ 99,50', rating: null },
    ]);
  });

  it('a parte do prestador nunca vira "recebeu": o painel não diz se o pagamento foi confirmado', () => {
    // recentServices.amount é payment.providerAmount (a parte prevista); o painel não manda o status do pagamento.
    const shares = providerHomeEarnings(
      data({
        recentServices: [
          { id: 'pago', clientName: 'A', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 72, rating: 5 },
          { id: 'sem-confirmacao', clientName: 'B', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 40, rating: null },
          { id: 'zero', clientName: 'C', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 0, rating: null },
          { id: 'ausente', clientName: 'D', service: 'S', completedAt: '2026-11-02T15:00:00', amount: undefined as unknown as number, rating: null },
          { id: 'nan', clientName: 'E', service: 'S', completedAt: '2026-11-02T15:00:00', amount: Number.NaN, rating: null },
          { id: 'negativo', clientName: 'F', service: 'S', completedAt: '2026-11-02T15:00:00', amount: -10, rating: null },
          { id: 'texto', clientName: 'G', service: 'S', completedAt: '2026-11-02T15:00:00', amount: '72' as unknown as number, rating: null },
          { id: 'infinito', clientName: 'H', service: 'S', completedAt: '2026-11-02T15:00:00', amount: Number.POSITIVE_INFINITY, rating: null },
        ],
      }),
      NOW,
    ).recent.map((r) => plain(r.share));
    expect(shares).toEqual([
      'Sua parte no serviço: R$ 72',
      'Sua parte no serviço: R$ 40',
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(shares.join(' ')).not.toContain('recebeu');
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

  it('conta nova (nenhum serviço nem ganho) não tem histórico', () => {
    const fresh = data({
      earnings: { today: 0, month: 0, previousMonth: 0, lastSixMonths: [{ month: 'Nov', revenue: 0 }] },
      services: { completedTotal: 0, completedThisWeek: 0 },
      rating: { average: 0, count: 0 },
    });
    expect(providerHomeEarnings(fresh, NOW).hasHistory).toBeFalse();
    expect(providerHomeEarnings(data(), NOW).hasHistory).toBeTrue();
    // Um ganho num mês antigo já conta, mesmo sem serviço no total.
    const old = { ...fresh, earnings: { ...fresh.earnings, lastSixMonths: [{ month: 'Jun', revenue: 50 }] } };
    expect(providerHomeEarnings(old, NOW).hasHistory).toBeTrue();
  });

  it('campos ausentes viram zero, sem quebrar', () => {
    const broken = { insights: null } as unknown as ProviderHomeData;
    const result = providerHomeEarnings(broken, NOW);
    expect(plain(result.kpis[0].value)).toBe('R$ 0');
    expect(result.revenue).toEqual([]);
    expect(result.recent).toEqual([]);
  });
  it('só informa recebimento com status confirmado e identifica valores pendentes', () => {
    const recent = providerHomeEarnings(
      data({
        recentServices: [
          { id: 'pago', clientName: 'A', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 72, rating: null, paymentStatus: 'CAPTURED' },
          { id: 'released', clientName: 'B', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 40, rating: null, paymentStatus: 'RELEASED' },
          { id: 'pendente', clientName: 'C', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 30, rating: null, paymentStatus: 'PENDENTE' },
          { id: 'ausente', clientName: 'D', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 20, rating: null },
          { id: 'invalido', clientName: 'E', service: 'S', completedAt: '2026-11-02T15:00:00', amount: 10, rating: null, paymentStatus: 'UNKNOWN' },
        ],
      }),
      NOW,
    ).recent.map((item) => plain(item.share));
    expect(recent).toEqual([
      'Você recebeu R$ 72',
      'Você recebeu R$ 40',
      'A receber: R$ 30',
      'Sua parte no serviço: R$ 20',
      'Sua parte no serviço: R$ 10',
    ]);
  });

});
