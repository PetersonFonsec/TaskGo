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
  const pay = (status: string, paymentStatus: string | null | undefined, perspective: 'customer' | 'provider' = 'customer') =>
    tgOrderNextStep({ id: '7', status, paymentStatus }, perspective);
  const PAY = { label: 'Pagar', link: ['/orders', '7', 'payment'] };
  const QR = { label: 'Ver QR Code', link: ['/orders', '7', 'payment'] };

  describe('pagamento (ciclo do backend)', () => {
    it('AGUARDANDO_PAGAMENTO sem pagamento iniciado: Pagar', () => {
      expect(pay('AGUARDANDO_PAGAMENTO', 'CREATED')).toEqual(PAY);
      expect(pay('AGUARDANDO_PAGAMENTO', null)).toEqual(PAY);
    });

    it('sem informação de pagamento: Pagar (o pedido nasce com o pagamento CREATED)', () => {
      expect(pay('AGUARDANDO_PAGAMENTO', undefined)).toEqual(PAY);
      expect(tgOrderNextStep({ id: '7', status: 'AGUARDANDO_PAGAMENTO' }, 'customer')).toEqual(PAY);
    });

    it('AGUARDANDO_PAGAMENTO com PIX pendente: Ver QR Code', () => {
      expect(pay('AGUARDANDO_PAGAMENTO', 'PENDENTE')).toEqual(QR);
    });

    it('pagamento autorizado, pago, falho, cancelado ou estornado: nenhuma ação (a API não aceita outro pagamento)', () => {
      for (const s of ['AUTORIZADO', 'AUTHORIZED', 'PAGO', 'CAPTURED', 'RELEASED', 'FALHOU', 'FAILED', 'CANCELADO', 'CANCELED', 'REEMBOLSADO', 'REFUNDED']) {
        expect(pay('AGUARDANDO_PAGAMENTO', s)).withContext(s).toBeNull();
      }
    });

    it('status de pagamento desconhecido: nenhuma ação, nunca o código cru', () => {
      for (const s of ['PROCESSANDO', 'pendente', '', '__proto__', 'toString']) {
        expect(pay('AGUARDANDO_PAGAMENTO', s)).withContext(s).toEqual(s === '' ? PAY : null);
      }
    });

    it('AGENDADO: o backend só agenda com pagamento pago, então o cliente não paga de novo', () => {
      for (const s of ['PAGO', 'CAPTURED', 'RELEASED', 'PENDENTE', 'CREATED', null, undefined]) {
        expect(pay('AGENDADO', s)).withContext(String(s)).toBeNull();
      }
    });

    it('concluído ou cancelado: nunca Pagar', () => {
      for (const s of ['CREATED', 'PENDENTE', null]) {
        expect(pay('CONCLUIDO', s)?.label).withContext(String(s)).toBe('Avaliar');
        expect(pay('CANCELADO', s)).withContext(String(s)).toBeNull();
        expect(pay('REJEITADO', s)).withContext(String(s)).toBeNull();
      }
    });

    it('prestador nunca recebe a ação de pagamento do cliente', () => {
      for (const s of ['CREATED', 'PENDENTE', null, undefined]) {
        expect(pay('AGUARDANDO_PAGAMENTO', s, 'provider')).withContext(String(s)).toBeNull();
        expect(pay('AGENDADO', s, 'provider')?.label).withContext(String(s)).toBe('Estou a caminho');
      }
    });
  });

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

describe('when: dia civil, com o fuso explícito', () => {
  const NY = 'America/New_York';
  const SP = 'America/Sao_Paulo';

  it('mesmo dia, ontem e amanhã no fuso pedido', () => {
    const now = new Date('2026-11-15T16:00:00-03:00');
    expect(when('2026-11-15T09:05:00-03:00', now, SP)).toBe('Hoje, 09:05');
    expect(when('2026-11-14T23:59:00-03:00', now, SP)).toBe('Ontem, 23:59');
    expect(when('2026-11-16T00:00:00-03:00', now, SP)).toBe('Amanhã, 00:00');
  });

  it('virada de mês e de ano', () => {
    expect(when('2026-11-01T08:00:00-03:00', new Date('2026-10-31T10:00:00-03:00'), SP)).toBe('Amanhã, 08:00');
    expect(when('2026-10-31T22:00:00-03:00', new Date('2026-11-01T07:00:00-03:00'), SP)).toBe('Ontem, 22:00');
    expect(when('2027-01-01T08:00:00-03:00', new Date('2026-12-31T22:00:00-03:00'), SP)).toBe('Amanhã, 08:00');
    expect(when('2027-01-05T08:00:00-03:00', new Date('2026-12-31T22:00:00-03:00'), SP)).toBe('Ter, 05 jan 2027, 08:00');
  });

  it('horário de verão em Nova York, início (8 mar 2026, dia de 23 h)', () => {
    const now = new Date('2026-03-08T12:00:00-04:00');
    expect(when('2026-03-07T23:30:00-05:00', now, NY)).toBe('Ontem, 23:30');
    expect(when('2026-03-08T00:30:00-05:00', now, NY)).toBe('Hoje, 00:30');
    expect(when('2026-03-08T03:30:00-04:00', now, NY)).toBe('Hoje, 03:30');
    expect(when('2026-03-09T00:15:00-04:00', now, NY)).toBe('Amanhã, 00:15');
    expect(when('2026-03-10T00:00:00-04:00', now, NY)).toBe('Ter, 10 mar, 00:00');
  });

  it('horário de verão em Nova York, fim (1º nov 2026, dia de 25 h)', () => {
    const now = new Date('2026-11-01T12:00:00-05:00');
    expect(when('2026-10-31T23:59:00-04:00', now, NY)).toBe('Ontem, 23:59');
    expect(when('2026-11-01T01:30:00-04:00', now, NY)).toBe('Hoje, 01:30');
    expect(when('2026-11-01T01:30:00-05:00', now, NY)).toBe('Hoje, 01:30');
    expect(when('2026-11-01T23:59:00-05:00', now, NY)).toBe('Hoje, 23:59');
    expect(when('2026-11-02T00:00:00-05:00', now, NY)).toBe('Amanhã, 00:00');
    // Hora de referência perto da meia-noite, onde a conta em milissegundos erra:
    const late = new Date('2026-11-01T23:30:00-05:00');
    expect(when('2026-10-31T00:10:00-04:00', late, NY)).toBe('Ontem, 00:10');
  });

  it('ISO com offset: o dia é o do fuso de quem vê', () => {
    const now = new Date('2026-11-15T16:00:00-03:00');
    expect(when('2026-11-16T01:30:00Z', now, SP)).toBe('Hoje, 22:30');
    expect(when('2026-11-18T14:00:00-03:00', now, SP)).toBe('Qua, 18 nov, 14:00');
    expect(when('2026-11-18T14:00:00-03:00', now, NY)).toBe('Qua, 18 nov, 12:00');
    expect(when('2026-11-16T01:30:00Z', now, NY)).toBe('Hoje, 20:30');
  });

  it('inválido continua "Data a combinar" com fuso', () => {
    for (const v of [null, undefined, '', 'amanhã', NaN, new Date('x')]) {
      expect(when(v as never, new Date(), NY)).withContext(String(v)).toBe('Data a combinar');
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
