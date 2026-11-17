import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '@environments/environment';
import type { ProviderHomeData } from '@modules/providers/home/data';
import { ProviderPayoutPage, type Settlement, validatePix } from './provider-payout.page';

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

  it('falhas de carga mostram alertas com "Tentar de novo", que recarrega tudo', () => {
    respond('error', 'error');
    expect(text()).toContain('Não foi possível carregar sua chave PIX');
    expect(text()).toContain('Não foi possível carregar seus repasses');

    el.querySelector<HTMLButtonElement>('tg-alert button')?.click();
    respond();
    expect(text()).not.toContain('Não foi possível carregar');
    expect(el.querySelectorAll('.settlement').length).toBe(4);
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
    expect(request.request.body).toEqual({ type: 'CPF', key: '123.456.789-01' });
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
});
