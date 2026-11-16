import type { TgAppointmentSource } from '@shared/design-system/appointment-card/tg-appointment-card.mapper';
import { PROVIDER_HOME_LIST_LIMIT, providerHomeAgenda } from './provider-home.agenda';

const NOW = new Date('2026-11-18T12:00:00');
const at = (day: number, hour: number) => new Date(2026, 10, day, hour).toISOString();

function order(id: string, status: string, scheduledFor: unknown = at(20, 9)): TgAppointmentSource {
  return {
    id,
    status,
    scheduledFor,
    client: { name: 'Cliente ' + id },
    service: { title: 'Serviço ' + id },
    addressSnap: { street: 'Rua A', number: '1', neighborhood: 'Moema' },
  };
}

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe('providerHomeAgenda', () => {
  it('separa solicitações, destaque e o resto; encerrados ficam de fora', () => {
    const agenda = providerHomeAgenda(
      [
        order('req', 'AGUARDANDO_APROVACAO'),
        order('ag', 'AGENDADO'),
        order('pay', 'AGUARDANDO_PAGAMENTO', at(19, 9)),
        order('done', 'CONCLUIDO'),
        order('cancel', 'CANCELADO'),
        order('rej', 'REJEITADO'),
      ],
      NOW,
    );
    expect(ids(agenda.requests)).toEqual(['req']);
    expect(agenda.requestCount).toBe(1);
    // AGENDADO pede ação do prestador; o que aguarda pagamento é mais cedo, mas não pede.
    expect(agenda.highlight?.id).toBe('ag');
    expect(ids(agenda.upcoming)).toEqual(['pay']);
  });

  it('sem ação do prestador, destaca o de data mais próxima; sem data vai para o fim', () => {
    const agenda = providerHomeAgenda(
      [
        order('none', 'AGUARDANDO_CONFIRMACAO_CLIENTE', null),
        order('late', 'AGUARDANDO_PAGAMENTO', at(25, 9)),
        order('soon', 'AGUARDANDO_CONFIRMACAO_CLIENTE', at(19, 9)),
      ],
      NOW,
    );
    expect(agenda.highlight?.id).toBe('soon');
    expect(ids(agenda.upcoming)).toEqual(['late', 'none']);
  });

  it('a ação mais cedo vence: Finalizar às 9h antes de Estou a caminho às 14h', () => {
    const agenda = providerHomeAgenda(
      [order('ag', 'AGENDADO', at(18, 14)), order('and', 'EM_ANDAMENTO', at(18, 9))],
      NOW,
    );
    expect(agenda.highlight?.id).toBe('and');
  });

  it('disputa e status desconhecido vão primeiro na lista e nunca para o destaque', () => {
    const agenda = providerHomeAgenda(
      [order('ag', 'AGENDADO'), order('disp', 'DISPUTA', at(30, 9)), order('novo', 'STATUS_NOVO', null)],
      NOW,
    );
    expect(agenda.highlight?.id).toBe('ag');
    expect(ids(agenda.upcoming)).toEqual(['disp', 'novo']);
  });

  it('sem nada em curso, não há destaque (mesmo com disputa)', () => {
    const agenda = providerHomeAgenda([order('disp', 'DISPUTA')], NOW);
    expect(agenda.highlight).toBeNull();
    expect(ids(agenda.upcoming)).toEqual(['disp']);
  });

  it('solicitações pela data mais próxima; empate mantém a ordem da API', () => {
    const agenda = providerHomeAgenda(
      [
        order('b', 'AGUARDANDO_APROVACAO', at(22, 9)),
        order('a1', 'AGUARDANDO_APROVACAO', at(20, 9)),
        order('a2', 'AGUARDANDO_APROVACAO', at(20, 9)),
        order('x', 'AGUARDANDO_APROVACAO', 'inválida'),
      ],
      NOW,
    );
    expect(ids(agenda.requests)).toEqual(['a1', 'a2', 'b', 'x']);
  });

  it(`não corta as listas: a tela mostra ${PROVIDER_HOME_LIST_LIMIT} e abre o resto sob demanda`, () => {
    const many = Array.from({ length: 12 }, (_, i) => order('r' + i, 'AGUARDANDO_APROVACAO'));
    const more = Array.from({ length: 12 }, (_, i) => order('a' + i, 'AGUARDANDO_PAGAMENTO'));
    const agenda = providerHomeAgenda([...many, ...more], NOW);
    expect(agenda.requests.length).toBe(12);
    expect(agenda.requestCount).toBe(12);
    // Um vai para o destaque; os outros 11 ficam na lista.
    expect(agenda.upcoming.length).toBe(11);
  });

  it('conta os atendimentos em curso marcados para hoje (sem solicitações nem encerrados)', () => {
    const agenda = providerHomeAgenda(
      [
        order('1', 'AGENDADO', at(18, 14)),
        order('2', 'EM_ANDAMENTO', at(18, 8)),
        order('3', 'AGENDADO', at(19, 9)),
        order('4', 'AGUARDANDO_APROVACAO', at(18, 16)),
        order('5', 'CONCLUIDO', at(18, 7)),
      ],
      NOW,
    );
    expect(agenda.todayCount).toBe(2);
  });

  it('usa a perspectiva do prestador: cliente como pessoa e Responder na tela de aceite', () => {
    const agenda = providerHomeAgenda([order('9', 'AGUARDANDO_APROVACAO')], NOW);
    expect(agenda.requests[0].person).toBe('Cliente 9');
  });

  it('não altera a entrada', () => {
    const input = Object.freeze([order('b', 'AGENDADO', at(22, 9)), order('a', 'AGENDADO', at(20, 9))]);
    providerHomeAgenda(input, NOW);
    expect(ids([...input])).toEqual(['b', 'a']);
  });
});
