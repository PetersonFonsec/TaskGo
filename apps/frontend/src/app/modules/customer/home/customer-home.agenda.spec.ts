import {
  CUSTOMER_HOME_HISTORY_LIMIT,
  CUSTOMER_HOME_UPCOMING_LIMIT,
  type CustomerHomeOrderSource,
  customerHomeAgenda,
} from './customer-home.agenda';

function o(id: string, status: string, extra: Partial<CustomerHomeOrderSource> = {}): CustomerHomeOrderSource {
  return { id, status, service: { title: 'Serviço ' + id }, ...extra };
}
const day = (d: number) => `2026-11-${String(d).padStart(2, '0')}T12:00:00.000Z`;
const ids = (items: readonly { id: string }[]) => items.map(({ id }) => id);

describe('customerHomeAgenda', () => {
  it('sem pedidos, nada em destaque, lista e histórico vazios', () => {
    expect(customerHomeAgenda([])).toEqual({ highlight: null, upcoming: [], history: [] });
  });

  it('sem ação pendente, destaca o ativo de data mais próxima', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGENDADO', { scheduledFor: day(20) }),
      o('b', 'EM_ANDAMENTO', { scheduledFor: day(16) }),
      o('c', 'AGUARDANDO_APROVACAO', { scheduledFor: day(18) }),
    ]);
    expect(agenda.highlight?.id).toBe('b');
    expect(ids(agenda.upcoming)).toEqual(['c', 'a']);
  });

  it('o que pede ação do cliente vem antes da data', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGENDADO', { scheduledFor: day(16) }),
      o('b', 'AGUARDANDO_CONFIRMACAO_CLIENTE', { scheduledFor: day(10) }),
      o('c', 'AGUARDANDO_PAGAMENTO', { scheduledFor: day(25), payment: { status: 'PENDENTE' } }),
    ]);
    // b e c pedem ação; entre eles, a data mais próxima.
    expect(agenda.highlight?.id).toBe('b');
    expect(ids(agenda.upcoming)).toEqual(['a', 'c']);
  });

  it('aguardando pagamento já pago (sem passo) não conta como ação', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGUARDANDO_PAGAMENTO', { scheduledFor: day(25), payment: { status: 'PAGO' } }),
      o('b', 'AGENDADO', { scheduledFor: day(16) }),
    ]);
    expect(agenda.highlight?.id).toBe('b');
  });

  it('sem data vai para o fim; empate mantém a ordem da API', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGENDADO', { scheduledFor: null }),
      o('b', 'AGENDADO', { scheduledFor: day(20) }),
      o('c', 'AGENDADO', { scheduledFor: 'não é data' }),
      o('d', 'AGENDADO', { scheduledFor: day(20) }),
    ]);
    expect(agenda.highlight?.id).toBe('b');
    expect(ids(agenda.upcoming)).toEqual(['d', 'a', 'c']);
  });

  it(`lista no máximo ${CUSTOMER_HOME_UPCOMING_LIMIT} outros ativos`, () => {
    const agenda = customerHomeAgenda(
      [1, 2, 3, 4, 5, 6].map((d) => o(String(d), 'AGENDADO', { scheduledFor: day(d) })),
    );
    expect(agenda.highlight?.id).toBe('1');
    expect(ids(agenda.upcoming)).toEqual(['2', '3', '4']);
  });

  it('o destaque leva os dados do card (endereço, avaliação) e a lista os da linha', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGENDADO', {
        scheduledFor: day(16),
        addressSnap: { street: 'Rua Harmonia', number: '123', complement: 'apto 41', neighborhood: 'Pinheiros' },
      }),
      o('b', 'CONCLUIDO', { scheduledFor: day(2), clientConfirmedAt: day(3), review: { id: 'r1' } }),
    ]);
    expect(agenda.highlight?.address).toBe('Rua Harmonia, 123, apto 41');
    expect(agenda.history[0].reviewed).toBeTrue();
  });

  it('não altera a lista recebida', () => {
    const orders = [o('a', 'AGENDADO', { scheduledFor: day(20) }), o('b', 'AGENDADO', { scheduledFor: day(10) })];
    customerHomeAgenda(orders);
    expect(ids(orders)).toEqual(['a', 'b']);
  });

  describe('status: o que vai para o destaque', () => {
    for (const status of ['AGENDADO', 'EM_DESLOCAMENTO', 'EM_ANDAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE']) {
      it(`${status} pode ir para o destaque`, () => {
        const agenda = customerHomeAgenda([o('a', status, { scheduledFor: day(16) })]);
        expect(agenda.highlight?.id).toBe('a');
        expect(agenda.upcoming).toEqual([]);
        expect(agenda.history).toEqual([]);
      });
    }

    it('DISPUTA nunca vai para o destaque, mas fica visível na lista', () => {
      const agenda = customerHomeAgenda([o('d', 'DISPUTA', { scheduledFor: day(16) })]);
      expect(agenda.highlight).toBeNull();
      expect(ids(agenda.upcoming)).toEqual(['d']);
      expect(agenda.history).toEqual([]);
    });

    it('disputa com data mais próxima não tira o destaque de um agendamento válido', () => {
      const agenda = customerHomeAgenda([
        o('d', 'DISPUTA', { scheduledFor: day(10) }),
        o('a', 'AGENDADO', { scheduledFor: day(20) }),
        o('b', 'EM_ANDAMENTO', { scheduledFor: day(18) }),
      ]);
      expect(agenda.highlight?.id).toBe('b');
      // A disputa vem primeiro na lista para não ficar escondida pelo limite.
      expect(ids(agenda.upcoming)).toEqual(['d', 'a']);
    });

    it('disputa não some da lista mesmo com mais ativos que o limite', () => {
      const agenda = customerHomeAgenda([
        ...[1, 2, 3, 4, 5].map((d) => o(String(d), 'AGENDADO', { scheduledFor: day(d) })),
        o('d', 'DISPUTA', { scheduledFor: day(28) }),
      ]);
      expect(agenda.highlight?.id).toBe('1');
      expect(ids(agenda.upcoming)).toEqual(['d', '2', '3']);
    });

    it('só pedidos em disputa: sem destaque, todos na lista', () => {
      const agenda = customerHomeAgenda([
        o('d1', 'DISPUTA', { scheduledFor: day(20) }),
        o('d2', 'DISPUTA', { scheduledFor: day(12) }),
      ]);
      expect(agenda.highlight).toBeNull();
      expect(ids(agenda.upcoming)).toEqual(['d2', 'd1']);
    });

    it('status desconhecido segue a regra da disputa: visível, nunca no destaque nem no histórico', () => {
      const agenda = customerHomeAgenda([
        o('x', 'NOVO_STATUS', { scheduledFor: day(16) }),
        o('a', 'AGENDADO', { scheduledFor: day(20) }),
      ]);
      expect(agenda.highlight?.id).toBe('a');
      expect(ids(agenda.upcoming)).toEqual(['x']);
      expect(agenda.history).toEqual([]);
    });

    it('concluídos, cancelados e recusados vão só para o histórico', () => {
      const agenda = customerHomeAgenda([
        o('c', 'CONCLUIDO', { clientConfirmedAt: day(3) }),
        o('x', 'CANCELADO', { payment: { status: 'CANCELADO', canceledAt: day(2) } }),
        o('r', 'REJEITADO', { requestedAt: day(1) }),
      ]);
      expect(agenda.highlight).toBeNull();
      expect(agenda.upcoming).toEqual([]);
      expect(ids(agenda.history)).toEqual(['c', 'x', 'r']);
    });
  });

  describe('histórico: ordem pelo encerramento', () => {
    it('agendado em outubro e concluído em novembro conta pela conclusão', () => {
      const agenda = customerHomeAgenda([
        o('out', 'CONCLUIDO', { scheduledFor: '2026-10-05T12:00:00Z', clientConfirmedAt: '2026-11-10T12:00:00Z' }),
        o('nov', 'CONCLUIDO', { scheduledFor: '2026-11-01T12:00:00Z', clientConfirmedAt: '2026-11-02T12:00:00Z' }),
      ]);
      expect(ids(agenda.history)).toEqual(['out', 'nov']);
    });

    it('concluído antes vem depois, mesmo com data marcada posterior', () => {
      const agenda = customerHomeAgenda([
        o('a', 'CONCLUIDO', { scheduledFor: day(20), clientConfirmedAt: day(21) }),
        o('b', 'CONCLUIDO', { scheduledFor: day(25), providerFinishedAt: day(26), clientConfirmedAt: day(14) }),
      ]);
      expect(ids(agenda.history)).toEqual(['a', 'b']);
    });

    it('sem confirmação do cliente, vale a finalização do prestador', () => {
      const agenda = customerHomeAgenda([
        o('a', 'CONCLUIDO', { providerFinishedAt: day(10) }),
        o('b', 'CONCLUIDO', { clientConfirmedAt: day(8) }),
      ]);
      expect(ids(agenda.history)).toEqual(['a', 'b']);
    });

    it('cancelado usa o cancelamento ou o reembolso do pagamento', () => {
      const agenda = customerHomeAgenda([
        o('reembolso', 'CANCELADO', { requestedAt: day(1), payment: { status: 'REEMBOLSADO', refundedAt: day(12) } }),
        o('cancelado', 'CANCELADO', { requestedAt: day(2), payment: { status: 'CANCELADO', canceledAt: day(15) } }),
        o('concluido', 'CONCLUIDO', { clientConfirmedAt: day(13) }),
      ]);
      expect(ids(agenda.history)).toEqual(['cancelado', 'concluido', 'reembolso']);
    });

    it('recusado sem pagamento cancelado usa a data do pedido', () => {
      const agenda = customerHomeAgenda([
        o('r', 'REJEITADO', { scheduledFor: day(28), requestedAt: day(5) }),
        o('c', 'CONCLUIDO', { clientConfirmedAt: day(9) }),
      ]);
      // A data marcada (28) não é encerramento: não coloca o recusado no topo.
      expect(ids(agenda.history)).toEqual(['c', 'r']);
    });

    it('sem nenhuma data, ou com data inválida, vai para o fim', () => {
      const agenda = customerHomeAgenda([
        o('sem', 'CONCLUIDO', {}),
        o('invalida', 'CONCLUIDO', { clientConfirmedAt: 'ontem', requestedAt: 'não é data' }),
        o('ok', 'CANCELADO', { requestedAt: day(1) }),
      ]);
      expect(ids(agenda.history)).toEqual(['ok', 'sem', 'invalida']);
    });

    it('data de encerramento inválida cai para a próxima data real', () => {
      const agenda = customerHomeAgenda([
        o('a', 'CONCLUIDO', { clientConfirmedAt: 'x', providerFinishedAt: day(20) }),
        o('b', 'CONCLUIDO', { clientConfirmedAt: day(15) }),
      ]);
      expect(ids(agenda.history)).toEqual(['a', 'b']);
    });

    it('datas iguais mantêm a ordem da API', () => {
      const agenda = customerHomeAgenda([
        o('a', 'CONCLUIDO', { clientConfirmedAt: day(10) }),
        o('b', 'CANCELADO', { payment: { status: 'CANCELADO', canceledAt: day(10) } }),
        o('c', 'CONCLUIDO', { clientConfirmedAt: day(10) }),
      ]);
      expect(ids(agenda.history)).toEqual(['a', 'b', 'c']);
    });

    it(`mostra no máximo ${CUSTOMER_HOME_HISTORY_LIMIT}`, () => {
      const agenda = customerHomeAgenda(
        [1, 2, 3, 4, 5].map((d) => o(String(d), 'CONCLUIDO', { clientConfirmedAt: day(d) })),
      );
      expect(ids(agenda.history)).toEqual(['5', '4', '3']);
    });

    it('não altera os pedidos nem a lista recebida', () => {
      const orders = [
        o('a', 'CONCLUIDO', { clientConfirmedAt: day(1) }),
        o('b', 'CONCLUIDO', { clientConfirmedAt: day(9) }),
        o('d', 'DISPUTA', { scheduledFor: day(3) }),
      ];
      const snapshot = JSON.stringify(orders);
      customerHomeAgenda(orders);
      expect(JSON.stringify(orders)).toBe(snapshot);
    });
  });
});
