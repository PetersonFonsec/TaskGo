import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '@environments/environment';
import type { ProviderHomeData } from '@modules/providers/home/data';
import {
  normalizePix,
  ProviderPayoutPage,
  type Settlement,
  SETTLEMENT_STATUS,
  settlementTotals,
  validatePix,
} from './provider-payout.page';

const URL = environment.url + '/payments/payout-destination';
const HOME_URL = environment.url + '/auth/provider-home';
const MONTHS = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

const home = (revenues: number[], completed = revenues.some((r) => r > 0) ? 4 : 0) =>
  ({
    earnings: {
      today: 0,
      month: revenues[5],
      previousMonth: revenues[4],
      lastSixMonths: MONTHS.map((month, i) => ({ month, revenue: revenues[i] })),
    },
    services: { completedTotal: completed, completedThisWeek: 0 },
    rating: { average: 0, count: 0 },
    pendingRequests: [],
    recentServices: [],
  }) as unknown as ProviderHomeData;

const SETTLEMENTS: Settlement[] = [
  { orderId: '42', amount: 180, status: 'PENDING', completedAt: null },
  { orderId: '31', amount: 250, status: 'SUCCEEDED', completedAt: '2026-11-14T15:20:00.000Z' },
  { orderId: '27', amount: 90.5, status: 'SUCCEEDED', completedAt: '2026-11-10T18:05:00.000Z' },
  { orderId: '20', amount: 60, status: 'FAILED', completedAt: null },
];

describe('ProviderPayoutPage (Ganhos)', () => {
  let fixture: ComponentFixture<ProviderPayoutPage>;
  let component: ProviderPayoutPage;
  let el: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderPayoutPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ProviderPayoutPage);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = () => fixture.detectChanges();
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const respond = (
    destination: object | 'error' = { type: 'EMAIL', key: 'bruno@email.com' },
    settlements: Settlement[] | 'error' = SETTLEMENTS,
    panel: ProviderHomeData | 'error' = home([320, 540, 410, 760, 640, 300]),
  ) => {
    const flush = (url: string, body: object | 'error') => {
      const request = http.expectOne(url);
      if (body === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
      else request.flush(body);
    };
    flush(URL, destination);
    flush(HOME_URL, panel);
    flush(URL + '/settlements', settlements);
    render();
  };
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button, a')).find((b) => b.textContent?.trim() === label);
  const stats = () => Array.from(el.querySelectorAll('.stat')).map((s) => (s.textContent ?? '').replace(/\s+/g, ' '));
  const sheetOpen = () => !!el.querySelector<HTMLDialogElement>('tg-sheet dialog')?.open;

  it('mostra o resumo, o gráfico, a chave PIX e os repasses', () => {
    respond();

    expect(el.querySelector('h1')?.textContent).toContain('Ganhos');
    const stats = Array.from(el.querySelectorAll('.stat')).map((s) => s.textContent?.replace(/\s/g, ' '));
    expect(stats[0]).toContain('Recebido');
    expect(stats[0]).toContain('R$ 340,50');
    expect(stats[1]).toContain('A receber');
    expect(stats[1]).toContain('R$ 180,00');

    expect(text()).toContain('Ganhos nos últimos 6 meses');
    expect(el.querySelectorAll('app-provider-revenue-chart').length).toBe(1);
    expect(component.revenue().map((m) => m.revenue)).toEqual([320, 540, 410, 760, 640, 300]);

    expect(el.querySelector('.pix__type')?.textContent).toContain('E-mail');
    expect(el.querySelector('.pix__key')?.textContent).toContain('bruno@email.com');

    const rows = el.querySelectorAll('.settlement');
    expect(rows.length).toBe(4);
    expect(rows[0].textContent).toContain('Pedido #42');
    expect(rows[0].textContent).toContain('Ainda não pago');
    expect(rows[0].textContent).toContain('Em processamento');
    expect(rows[1].textContent).toContain('Pago em 14/11/2026 às 12:20');
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/orders/31');
  });

  it('avisa quando um repasse falhou', () => {
    respond();
    expect(text()).toContain('Um repasse falhou');
    expect(el.querySelectorAll('.settlement')[3].textContent).toContain('Falhou');
  });

  it('profissional sem ganhos: troca resumo, gráfico e repasses pelo estado vazio e mantém a chave PIX', () => {
    respond({ type: 'CPF', key: '' }, [], home([0, 0, 0, 0, 0, 0]));

    expect(component.noEarnings()).toBeTrue();
    expect(text()).toContain('Seus ganhos aparecem aqui');
    expect(el.querySelector('.stat')).toBeNull();
    expect(el.querySelector('app-provider-revenue-chart')).toBeNull();
    expect(text()).not.toContain('Repasses');
    expect(text()).toContain('Cadastre sua chave PIX para receber');
    expect(button('Ver meus serviços')?.getAttribute('href')).toBe('/provider/services');
  });

  it('com repasses mas sem histórico no painel, não mostra o estado vazio', () => {
    respond(undefined, SETTLEMENTS, home([0, 0, 0, 0, 0, 0]));
    expect(component.noEarnings()).toBeFalse();
    expect(el.querySelectorAll('.settlement').length).toBe(4);
  });

  it('falha do painel não vira estado vazio: mostra o erro no gráfico', () => {
    respond({ type: 'CPF', key: '' }, [], 'error');
    expect(component.noEarnings()).toBeFalse();
    expect(text()).toContain('Não foi possível carregar o gráfico');
  });

  it('falhas de carga mostram alertas com "Tentar de novo"', () => {
    respond('error', 'error', 'error');
    expect(text()).toContain('Não foi possível carregar sua chave PIX');
    expect(text()).toContain('Não foi possível carregar o gráfico');
    expect(text()).toContain('Não foi possível carregar seus repasses');
  });

  describe('tentar de novo por recurso', () => {
    const retry = (title: string) => {
      const alert = Array.from(el.querySelectorAll('tg-alert')).find((a) => a.textContent?.includes(title));
      alert?.querySelector<HTMLButtonElement>('button')?.click();
      render();
    };

    it('o do gráfico consulta só o painel e mantém a chave e os repasses', () => {
      respond(undefined, SETTLEMENTS, 'error');
      retry('Não foi possível carregar o gráfico');
      http.expectNone(URL);
      http.expectNone(URL + '/settlements');
      http.expectOne(HOME_URL).flush(home([1, 2, 3, 4, 5, 6]));
      render();
      expect(component.revenue().map((m) => m.revenue)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(el.querySelector('.pix__key')?.textContent).toContain('bruno@email.com');
      expect(el.querySelectorAll('.settlement').length).toBe(4);
    });

    it('o da chave consulta só a chave PIX', () => {
      respond('error');
      retry('Não foi possível carregar sua chave PIX');
      http.expectNone(HOME_URL);
      http.expectNone(URL + '/settlements');
      http.expectOne(URL).flush({ type: 'CPF', key: '12345678901' });
      render();
      expect(el.querySelector('.pix__key')?.textContent).toContain('12345678901');
      expect(component.revenue().length).toBe(6);
    });

    it('o dos repasses consulta só os repasses e mostra os valores certos', () => {
      respond(undefined, 'error');
      retry('Não foi possível carregar seus repasses');
      http.expectNone(URL);
      http.expectNone(HOME_URL);
      http.expectOne(URL + '/settlements').flush(SETTLEMENTS);
      render();
      expect(stats()[0]).toContain('R$ 340,50');
      expect(stats()[1]).toContain('R$ 180,00');
      expect(el.querySelectorAll('.settlement').length).toBe(4);
    });

    it('uma resposta antiga do mesmo recurso não sobrescreve a mais nova', () => {
      respond(undefined, 'error');
      component.loadSettlements();
      const older = http.expectOne(URL + '/settlements');
      component.loadSettlements();
      const newer = http.match(URL + '/settlements');
      expect(older.cancelled).toBeTrue();
      expect(newer.length).toBe(1);
      newer[0].flush([{ orderId: '9', amount: 10, status: 'SUCCEEDED', completedAt: null }]);
      render();
      expect(component.settlements().map((s) => s.orderId)).toEqual(['9']);
    });
  });

  describe('totais', () => {
    it('com falha nos repasses, os indicadores ficam indisponíveis, nunca R$ 0,00', () => {
      respond(undefined, 'error');
      const values = stats();
      expect(values[0]).toContain('Indisponível');
      expect(values[1]).toContain('Indisponível');
      expect(values.join(' ')).not.toContain('R$');
      expect(text()).toContain('Não foi possível carregar seus repasses');
    });

    it('lista vazia com sucesso (e histórico no painel) mostra R$ 0,00', () => {
      respond(undefined, []);
      expect(component.noEarnings()).toBeFalse();
      expect(stats()[0]).toContain('R$ 0,00');
      expect(stats()[1]).toContain('R$ 0,00');
    });

    it('enquanto carrega, mostra skeleton nos indicadores', () => {
      http.expectOne(URL).flush({ type: 'CPF', key: '' });
      http.expectOne(HOME_URL).flush(home([1, 1, 1, 1, 1, 1]));
      render();
      expect(el.querySelectorAll('.stat tg-skeleton').length).toBe(2);
      expect(stats().join(' ')).not.toContain('R$');
      http.expectOne(URL + '/settlements').flush([]);
    });

    it('a falha dos repasses não esconde a chave nem o gráfico', () => {
      respond(undefined, 'error');
      expect(el.querySelector('.pix__key')?.textContent).toContain('bruno@email.com');
      expect(el.querySelectorAll('app-provider-revenue-chart').length).toBe(1);
    });

    it('em análise, bloqueado e desconhecido não entram em "A receber" e aparecem à parte', () => {
      respond(undefined, [
        { orderId: '1', amount: 100, status: 'PENDING', completedAt: null },
        { orderId: '2', amount: 70, status: 'REVIEW', completedAt: null },
        { orderId: '3', amount: 30, status: 'BLOCKED', completedAt: null },
        { orderId: '4', amount: 999, status: 'NOVO_STATUS', completedAt: null },
      ]);
      expect(stats()[1]).toContain('R$ 100,00');
      expect(stats()[1]).toContain('Fora R$ 1.099,00 em análise ou bloqueados.');
      const rows = el.querySelectorAll('.settlement');
      expect(rows[1].textContent).toContain('Em análise');
      expect(rows[2].textContent).toContain('Bloqueado');
      expect(rows[3].textContent).toContain('Em análise');
    });
  });

  describe('alerta de repasses com falha', () => {
    const failed = (n: number): Settlement[] =>
      Array.from({ length: n }, (_, i) => ({ orderId: 'f' + i, amount: 10, status: 'FAILED', completedAt: null }));

    it('sem falhas, sem alerta', () => {
      respond(undefined, SETTLEMENTS.filter((s) => s.status !== 'FAILED'));
      expect(text()).not.toContain('falhou');
      expect(text()).not.toContain('falharam');
    });

    it('uma falha: singular', () => {
      respond(undefined, failed(1));
      expect(text()).toContain('Um repasse falhou');
      expect(text()).toContain('fale com o suporte para reenviar.');
    });

    it('duas ou mais: plural, com a quantidade', () => {
      respond(undefined, failed(3));
      expect(text()).toContain('3 repasses falharam');
      expect(text()).toContain('fale com o suporte para reenviá-los.');
      expect(text()).not.toContain('Um repasse falhou');
    });
  });

  it('sem chave: o alerta abre o cadastro', () => {
    respond({ type: 'CPF', key: '' });
    button('Cadastrar chave PIX')?.click();
    render();
    expect(sheetOpen()).toBeTrue();
    expect(text()).toContain('Cadastrar chave PIX');
  });

  it('valida a chave antes de enviar', () => {
    respond();
    button('Alterar chave')?.click();
    render();
    component.draft = { type: 'CPF', key: '123' };
    button('Salvar chave')?.click();
    render();

    http.expectNone({ method: 'PUT' });
    expect(text()).toContain('O CPF tem 11 números.');
  });

  it('salva a chave, fecha o painel e mostra a chave normalizada pela API', () => {
    respond();
    button('Alterar chave')?.click();
    render();
    expect(component.draft).toEqual({ type: 'EMAIL', key: 'bruno@email.com' });

    component.draft = { type: 'CPF', key: '123.456.789-01' };
    button('Salvar chave')?.click();
    const request = http.expectOne({ method: 'PUT', url: URL });
    expect(request.request.body).toEqual({ type: 'CPF', key: '12345678901' });
    request.flush({ type: 'CPF', key: '12345678901' });
    render();

    expect(sheetOpen()).toBeFalse();
    expect(el.querySelector('.pix__key')?.textContent).toContain('12345678901');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Chave PIX salva.');
  });

  it('falha ao salvar: o painel fica aberto com o motivo da API', () => {
    respond();
    component.openEdit();
    component.draft = { type: 'EMAIL', key: 'novo@email.com' };
    render();
    button('Salvar chave')?.click();
    http
      .expectOne({ method: 'PUT', url: URL })
      .flush({ message: 'Chave PIX inválida para o tipo informado' }, { status: 400, statusText: 'Bad Request' });
    render();

    expect(sheetOpen()).toBeTrue();
    expect(text()).toContain('Chave PIX inválida para o tipo informado');
    expect(component.saving()).toBeFalse();
  });

  it('envia o celular e o CNPJ já normalizados', () => {
    respond();
    for (const [type, key, sent] of [
      ['PHONE', '+55 (11) 91234-5678', '5511912345678'],
      ['CNPJ', '12.345.678/0001-90', '12345678000190'],
    ] as const) {
      component.openEdit();
      component.draft = { type, key };
      component.save();
      const request = http.expectOne({ method: 'PUT', url: URL });
      expect(request.request.body).toEqual({ type, key: sent });
      request.flush({ type, key: sent });
      render();
    }
  });

  it('mostra os erros de validação da API (lista de mensagens)', () => {
    respond();
    component.openEdit();
    component.draft = { type: 'EMAIL', key: 'novo@email.com' };
    component.save();
    http
      .expectOne({ method: 'PUT', url: URL })
      .flush({ message: ['key must be shorter than or equal to 254 characters'] }, { status: 400, statusText: 'Bad Request' });
    render();
    expect(text()).toContain('key must be shorter than or equal to 254 characters');
  });

  it('não envia duas vezes enquanto salva', () => {
    respond();
    component.openEdit();
    component.save();
    component.save();
    const requests = http.match({ method: 'PUT', url: URL });
    expect(requests.length).toBe(1);
    requests[0].flush({});
  });
});

describe('validatePix', () => {
  it('segue as regras da API para cada tipo', () => {
    expect(validatePix({ type: 'CPF', key: '123.456.789-01' })).toBeNull();
    expect(validatePix({ type: 'CNPJ', key: '12.345.678/0001-90' })).toBeNull();
    expect(validatePix({ type: 'PHONE', key: '(11) 91234-5678' })).toBeNull();
    expect(validatePix({ type: 'EMAIL', key: 'a@b.co' })).toBeNull();
    expect(validatePix({ type: 'RANDOM', key: '123e4567-e89b-12d3-a456-426614174000' })).toBeNull();
  });

  it('diz como corrigir', () => {
    expect(validatePix({ type: 'CPF', key: '' })).toBe('Informe a chave PIX.');
    expect(validatePix({ type: 'CNPJ', key: '123' })).toBe('O CNPJ tem 14 números.');
    expect(validatePix({ type: 'PHONE', key: '1234' })).toBe('Informe o celular com DDD.');
    expect(validatePix({ type: 'EMAIL', key: 'sem-arroba' })).toBe('Informe um e-mail válido.');
    expect(validatePix({ type: 'RANDOM', key: 'abc' })).toContain('chave aleatória');
  });

  it('aceita espaços e pontuação que a API tira', () => {
    expect(validatePix({ type: 'CPF', key: ' 123 456 789 01 ' })).toBeNull();
    expect(validatePix({ type: 'PHONE', key: '+55 (11) 91234-5678' })).toBeNull();
    expect(validatePix({ type: 'PHONE', key: '11 3456-7890' })).toBeNull();
    expect(validatePix({ type: 'EMAIL', key: '  ana@email.com  ' })).toBeNull();
    expect(validatePix({ type: 'RANDOM', key: '123E4567-E89B-12D3-A456-426614174000' })).toBeNull();
  });

  it('recusa o que a API recusaria', () => {
    expect(validatePix({ type: 'CPF', key: '123.456.789-0' })).toBe('O CPF tem 11 números.');
    expect(validatePix({ type: 'CPF', key: '123.456.789/01' })).toBe('O CPF tem 11 números.');
    expect(validatePix({ type: 'CPF', key: '1234567890a' })).toBe('O CPF tem 11 números.');
    expect(validatePix({ type: 'CNPJ', key: '12.345.678/0001-9' })).toBe('O CNPJ tem 14 números.');
    expect(validatePix({ type: 'PHONE', key: '119123456789' })).toBe('Informe o celular com DDD.');
    expect(validatePix({ type: 'PHONE', key: '91234-5678' })).toBe('Informe o celular com DDD.');
    expect(validatePix({ type: 'EMAIL', key: 'ana @email.com' })).toBe('Informe um e-mail válido.');
    expect(validatePix({ type: 'EMAIL', key: 'ana@email' })).toBe('Informe um e-mail válido.');
    expect(validatePix({ type: 'RANDOM', key: '123e4567e89b12d3a456426614174000' })).toContain('chave aleatória');
    expect(validatePix({ type: 'EMAIL', key: '   ' })).toBe('Informe a chave PIX.');
  });

  it('respeita o limite de 254 caracteres do DTO', () => {
    const local = 'a'.repeat(64);
    const at254 = `${local}@${'b'.repeat(254 - 64 - 1 - 4)}.com`;
    expect(at254.length).toBe(254);
    expect(validatePix({ type: 'EMAIL', key: at254 })).toBeNull();
    expect(validatePix({ type: 'EMAIL', key: 'c' + at254 })).toBe('Use até 254 caracteres.');
  });
});

describe('classificação dos repasses', () => {
  const one = (status: string, amount = 10.1): Settlement => ({ orderId: '1', amount, status, completedAt: null });

  it('cada status conhecido tem grupo explícito', () => {
    expect(Object.fromEntries(Object.entries(SETTLEMENT_STATUS).map(([k, v]) => [k, v.group]))).toEqual({
      READY: 'incoming',
      SUBMITTING: 'incoming',
      PENDING: 'incoming',
      SUCCEEDED: 'received',
      FAILED: 'failed',
      REVIEW: 'held',
      BLOCKED: 'held',
    });
  });

  it('SUCCEEDED entra só em Recebido', () => {
    expect(settlementTotals([one('SUCCEEDED')])).toEqual({ received: 10.1, incoming: 0, held: 0 });
  });

  it('READY, SUBMITTING e PENDING entram só em A receber', () => {
    for (const status of ['READY', 'SUBMITTING', 'PENDING']) {
      expect(settlementTotals([one(status)])).toEqual({ received: 0, incoming: 10.1, held: 0 });
    }
  });

  it('FAILED não entra em nenhum total', () => {
    expect(settlementTotals([one('FAILED')])).toEqual({ received: 0, incoming: 0, held: 0 });
  });

  it('REVIEW, BLOCKED e status desconhecidos não inflam A receber', () => {
    for (const status of ['REVIEW', 'BLOCKED', 'QUALQUER', 'toString', '']) {
      expect(settlementTotals([one(status)])).toEqual({ received: 0, incoming: 0, held: 10.1 });
    }
  });

  it('soma em centavos, sem erro de ponto flutuante', () => {
    const items = [one('SUCCEEDED', 0.1), one('SUCCEEDED', 0.2), one('PENDING', 19.99), one('READY', 0.01)];
    expect(settlementTotals(items)).toEqual({ received: 0.3, incoming: 20, held: 0 });
  });
});

describe('normalizePix', () => {
  it('tira espaços e pontuação como a API', () => {
    expect(normalizePix({ type: 'CPF', key: ' 123.456.789-01 ' })).toBe('12345678901');
    expect(normalizePix({ type: 'CNPJ', key: '12.345.678/0001-90' })).toBe('12345678000190');
    expect(normalizePix({ type: 'PHONE', key: '+55 (11) 91234-5678' })).toBe('5511912345678');
    expect(normalizePix({ type: 'EMAIL', key: '  ana@email.com ' })).toBe('ana@email.com');
    expect(normalizePix({ type: 'RANDOM', key: ' 123e4567-e89b-12d3-a456-426614174000 ' })).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });
});
