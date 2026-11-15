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

  it('status desconhecido fica na agenda, nunca no histórico', () => {
    const agenda = customerHomeAgenda([o('x', 'NOVO_STATUS', { scheduledFor: day(16) })]);
    expect(agenda.highlight?.id).toBe('x');
    expect(agenda.history).toEqual([]);
  });

  it(`histórico: concluídos, cancelados e recusados, mais recentes primeiro, até ${CUSTOMER_HOME_HISTORY_LIMIT}`, () => {
    const agenda = customerHomeAgenda([
      o('a', 'CONCLUIDO', { scheduledFor: day(2) }),
      o('b', 'CANCELADO', { scheduledFor: null, requestedAt: day(9) }),
      o('c', 'REJEITADO', { scheduledFor: day(5) }),
      o('d', 'CONCLUIDO', { scheduledFor: day(1) }),
      o('e', 'AGENDADO', { scheduledFor: day(20) }),
    ]);
    expect(ids(agenda.history)).toEqual(['b', 'c', 'a']);
    expect(agenda.highlight?.id).toBe('e');
  });

  it('o destaque leva os dados do card (endereço, avaliação) e a lista os da linha', () => {
    const agenda = customerHomeAgenda([
      o('a', 'AGENDADO', {
        scheduledFor: day(16),
        addressSnap: { street: 'Rua Harmonia', number: '123', complement: 'apto 41', neighborhood: 'Pinheiros' },
      }),
      o('b', 'CONCLUIDO', { scheduledFor: day(2), review: { id: 'r1' } }),
    ]);
    expect(agenda.highlight?.address).toBe('Rua Harmonia, 123, apto 41');
    expect(agenda.history[0].reviewed).toBeTrue();
  });

  it('não altera a lista recebida', () => {
    const orders = [o('a', 'AGENDADO', { scheduledFor: day(20) }), o('b', 'AGENDADO', { scheduledFor: day(10) })];
    customerHomeAgenda(orders);
    expect(ids(orders)).toEqual(['a', 'b']);
  });
});
