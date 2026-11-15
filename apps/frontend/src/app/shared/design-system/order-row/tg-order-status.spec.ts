import { TG_ORDER_STATUSES, tgOrderNextStep, tgOrderStatus } from './tg-order-status';
import { when } from './tg-order-row.component';

describe('tgOrderStatus (mapa aprovado na Etapa 7)', () => {
  const table: [string, string, string, string][] = [
    ['AGUARDANDO_APROVACAO', 'Aguardando o profissional', 'Aguardando sua resposta', 'waiting'],
    ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento', 'Aguardando pagamento', 'waiting'],
    ['AGENDADO', 'Agendado', 'Agendado', 'confirmed'],
    ['EM_DESLOCAMENTO', 'Profissional a caminho', 'A caminho', 'progress'],
    ['EM_ANDAMENTO', 'Em andamento', 'Em andamento', 'progress'],
    ['AGUARDANDO_CONFIRMACAO_CLIENTE', 'Aguardando sua confirmação', 'Aguardando o cliente', 'waiting'],
    ['CONCLUIDO', 'Concluído', 'Concluído', 'done'],
    ['DISPUTA', 'Em análise', 'Em análise', 'waiting'],
    ['REJEITADO', 'Recusado', 'Recusado', 'cancelled'],
    ['CANCELADO', 'Cancelado', 'Cancelado', 'cancelled'],
  ];

  it('cobre os 10 status do backend', () => {
    expect(table.map(([s]) => s).sort()).toEqual([...TG_ORDER_STATUSES].sort());
  });

  it('texto do cliente e do prestador, mesmo tom', () => {
    for (const [status, customer, provider, tone] of table) {
      expect(tgOrderStatus(status, 'customer')).withContext(status).toEqual({ label: customer, tone: tone as never });
      expect(tgOrderStatus(status, 'provider')).withContext(status).toEqual({ label: provider, tone: tone as never });
    }
  });

  it('desconhecido mostra "Em atualização" no neutro, nunca o código cru', () => {
    for (const status of ['PENDENTE', 'CONFIRMADO', 'agendado', '', null, undefined, 3, 'toString', '__proto__', 'constructor']) {
      expect(tgOrderStatus(status, 'customer')).withContext(String(status)).toEqual({ label: 'Em atualização', tone: 'neutral' });
      expect(tgOrderStatus(status, 'provider')).withContext(String(status)).toEqual({ label: 'Em atualização', tone: 'neutral' });
    }
  });
});

describe('tgOrderNextStep', () => {
  const step = (status: string, perspective: 'customer' | 'provider', reviewed = false) =>
    tgOrderNextStep({ id: '7', status, reviewed }, perspective);

  it('cliente: Pagar, Confirmar conclusão e Avaliar (só sem avaliação)', () => {
    expect(step('AGUARDANDO_PAGAMENTO', 'customer')).toEqual({ label: 'Pagar', link: ['/orders', '7', 'payment'] });
    expect(step('AGUARDANDO_CONFIRMACAO_CLIENTE', 'customer')).toEqual({ label: 'Confirmar conclusão', link: ['/orders', '7', 'confirm'] });
    expect(step('CONCLUIDO', 'customer')).toEqual({ label: 'Avaliar', link: ['/orders', '7', 'review'] });
    expect(step('CONCLUIDO', 'customer', true)).toBeNull();
    for (const s of ['AGUARDANDO_APROVACAO', 'AGENDADO', 'EM_DESLOCAMENTO', 'EM_ANDAMENTO', 'DISPUTA', 'REJEITADO', 'CANCELADO', 'X']) {
      expect(step(s, 'customer')).withContext(s).toBeNull();
    }
  });

  it('prestador: Responder, Estou a caminho, Iniciar serviço e Finalizar serviço', () => {
    expect(step('AGUARDANDO_APROVACAO', 'provider')).toEqual({ label: 'Responder', link: ['/orders', '7'] });
    expect(step('AGENDADO', 'provider')).toEqual({ label: 'Estou a caminho', action: 'EM_DESLOCAMENTO' });
    expect(step('EM_DESLOCAMENTO', 'provider')).toEqual({ label: 'Iniciar serviço', action: 'EM_ANDAMENTO' });
    expect(step('EM_ANDAMENTO', 'provider')).toEqual({ label: 'Finalizar serviço', link: ['/orders', '7', 'finish'] });
    for (const s of ['AGUARDANDO_PAGAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE', 'CONCLUIDO', 'DISPUTA', 'REJEITADO', 'CANCELADO', 'X']) {
      expect(step(s, 'provider')).withContext(s).toBeNull();
    }
  });
});

describe('when (data da linha)', () => {
  const now = new Date(2026, 10, 15, 16, 0); // domingo, 15 nov 2026, 16:00 (horário local)

  it('relativa perto de hoje', () => {
    expect(when(new Date(2026, 10, 15, 9, 5), now)).toBe('Hoje, 09:05');
    expect(when(new Date(2026, 10, 16, 0, 0), now)).toBe('Amanhã, 00:00');
    expect(when(new Date(2026, 10, 14, 23, 59), now)).toBe('Ontem, 23:59');
  });

  it('dia da semana, dia e mês; com o ano quando não é o atual', () => {
    expect(when(new Date(2026, 10, 18, 14, 0), now)).toBe('Qua, 18 nov, 14:00');
    expect(when(new Date(2026, 10, 2, 8, 30), now)).toBe('Seg, 02 nov, 08:30');
    expect(when(new Date(2025, 11, 31, 10, 0), now)).toBe('Qua, 31 dez 2025, 10:00');
  });

  it('aceita texto ISO e número', () => {
    const d = new Date(2026, 10, 18, 14, 0);
    expect(when(d.toISOString(), now)).toBe('Qua, 18 nov, 14:00');
    expect(when(d.getTime(), now)).toBe('Qua, 18 nov, 14:00');
  });

  it('sem data válida: "Data a combinar"', () => {
    for (const v of [null, undefined, '', 'amanhã', NaN, new Date('x')]) {
      expect(when(v as never, now)).withContext(String(v)).toBe('Data a combinar');
    }
  });
});
