import { orderTabs, type OrderTabsSource } from './order-tabs';

function order(id: string, status: string, extra: Partial<OrderTabsSource> & Record<string, unknown> = {}): OrderTabsSource {
  return { id, status, scheduledFor: '2026-11-20T12:00:00.000Z', service: { title: 'Serviço ' + id }, ...extra };
}

const ids = (tab: { orders: { id: string }[] }) => tab.orders.map((o) => o.id);

describe('orderTabs', () => {
  describe('cliente', () => {
    it('separa em Ativos, Concluídos e Cancelados, sem perder pedidos', () => {
      const tabs = orderTabs(
        [
          order('1', 'AGENDADO'),
          order('2', 'CONCLUIDO'),
          order('3', 'CANCELADO'),
          order('4', 'REJEITADO'),
          order('5', 'DISPUTA'),
          order('6', 'STATUS_NOVO'),
        ],
        'customer',
      );
      expect(tabs.map((t) => t.value)).toEqual(['ativos', 'concluidos', 'cancelados']);
      expect(tabs.map((t) => t.label)).toEqual(['Ativos', 'Concluídos', 'Cancelados']);
      expect(ids(tabs[0])).toEqual(['1', '5', '6']);
      expect(ids(tabs[1])).toEqual(['2']);
      expect(ids(tabs[2])).toEqual(['3', '4']);
      expect(tabs.map((t) => t.counted)).toEqual([true, false, false]);
    });

    it('em Ativos, o que pede ação do cliente vem antes; depois por data, sem data no fim', () => {
      const tabs = orderTabs(
        [
          order('sem-data', 'AGENDADO', { scheduledFor: null }),
          order('depois', 'AGENDADO', { scheduledFor: '2026-11-25T12:00:00.000Z' }),
          order('antes', 'AGENDADO', { scheduledFor: '2026-11-19T12:00:00.000Z' }),
          order('confirmar', 'AGUARDANDO_CONFIRMACAO_CLIENTE', { scheduledFor: '2026-11-30T12:00:00.000Z' }),
        ],
        'customer',
      );
      expect(ids(tabs[0])).toEqual(['confirmar', 'antes', 'depois', 'sem-data']);
    });

    it('nos encerrados, o encerramento mais recente vem primeiro', () => {
      const tabs = orderTabs(
        [
          order('velho', 'CONCLUIDO', { clientConfirmedAt: '2026-10-01T12:00:00.000Z' }),
          order('novo', 'CONCLUIDO', { clientConfirmedAt: '2026-11-10T12:00:00.000Z' }),
          order('so-pedido', 'CONCLUIDO', { requestedAt: '2026-11-01T12:00:00.000Z' }),
        ],
        'customer',
      );
      expect(ids(tabs[1])).toEqual(['novo', 'so-pedido', 'velho']);
    });
  });

  describe('prestador', () => {
    it('separa em Solicitações, Agendados e Histórico', () => {
      const tabs = orderTabs(
        [
          order('1', 'AGUARDANDO_APROVACAO'),
          order('2', 'AGENDADO'),
          order('3', 'AGUARDANDO_PAGAMENTO'),
          order('4', 'DISPUTA'),
          order('5', 'CONCLUIDO'),
          order('6', 'REJEITADO'),
          order('7', 'CANCELADO'),
        ],
        'provider',
      );
      expect(tabs.map((t) => t.label)).toEqual(['Solicitações', 'Agendados', 'Histórico']);
      expect(ids(tabs[0])).toEqual(['1']);
      expect(ids(tabs[1])).toEqual(['2', '3', '4']);
      expect(ids(tabs[2])).toEqual(['5', '6', '7']);
      expect(tabs.map((t) => t.counted)).toEqual([true, false, false]);
    });

    it('a linha mostra o cliente para o prestador', () => {
      const [requests] = orderTabs([order('1', 'AGUARDANDO_APROVACAO', { client: { name: 'Marina' } })], 'provider');
      expect(requests.orders[0].person).toBe('Marina');
    });
  });

  it('não altera a lista recebida', () => {
    const input = [order('b', 'AGENDADO', { scheduledFor: '2026-12-01' }), order('a', 'AGENDADO', { scheduledFor: '2026-11-01' })];
    orderTabs(input, 'customer');
    expect(input.map((o) => o.id)).toEqual(['b', 'a']);
  });
});
