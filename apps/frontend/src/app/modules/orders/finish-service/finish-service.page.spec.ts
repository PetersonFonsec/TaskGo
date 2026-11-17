import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { environment } from '@environments/environment';
import type { OrderDetails } from '@shared/service/order/order.model';
import { FINISH_REDIRECT_DELAY, FinishServicePage } from './finish-service.page';
import { finishServiceView } from './finish-service.view';

const ORDER_URL = environment.url + '/orders/5';
const FINISH_URL = ORDER_URL + '/finish';

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '5',
    status: 'EM_ANDAMENTO',
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
    provider: { id: '17', name: 'João Pereira', photoUrl: null, ratingAvg: 4.8, ratingCount: 3, verified: true },
    client: { id: '7', name: 'Maria Souza', photoUrl: null },
    schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: '2026-10-03T17:00:00.000Z' },
    address: {
      street: 'Rua Harmonia',
      number: '123',
      complement: null,
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      cep: '05435-000',
    },
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 150, finalAmount: 150 },
    providerEarnings: null,
    distanceKm: null,
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

describe('FinishServicePage (Finalizar serviço)', () => {
  let fixture: ComponentFixture<FinishServicePage>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinishServicePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '5' })) } },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(FinishServicePage);
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = () => fixture.detectChanges();
  const text = (node: Element | null = el) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const rows = () =>
    [...el.querySelectorAll('dl > div')].map((row) => `${text(row.querySelector('dt'))}: ${text(row.querySelector('dd'))}`);
  const control = (label: string) =>
    [...el.querySelectorAll<HTMLElement>('button, a')].find((b) => text(b) === label) ?? null;
  const submitButton = () => el.querySelector<HTMLButtonElement>('button[type="submit"]');
  const textarea = () => el.querySelector<HTMLTextAreaElement>('textarea');
  const load = (order: OrderDetails | 'error' | 404 = details()) => {
    const request = http.expectOne(ORDER_URL);
    expect(request.request.method).toBe('GET');
    if (order === 'error') request.flush('erro', { status: 500, statusText: 'Erro' });
    else if (order === 404) request.flush({ message: 'Pedido 5 não encontrado' }, { status: 404, statusText: 'Not Found' });
    else request.flush(order);
    render();
  };
  const type = (value: string) => {
    const input = textarea()!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    render();
  };
  const send = () => {
    submitButton()!.click();
    render();
  };

  it('carregando: região ocupada, sem formulário', () => {
    expect(el.querySelector('tg-loading .tg-loading__body')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('form')).toBeNull();
    load();
    expect(el.querySelector('tg-loading .tg-loading__body')?.getAttribute('aria-busy')).toBeNull();
  });

  it('pronto: um h1, status, cliente, quando, endereço e o valor combinado', () => {
    load();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(text(el.querySelector('h1'))).toBe('Finalizar serviço');
    expect(text()).toContain('Pedido #5 · Elétrica');
    expect(text(el.querySelector('tg-badge'))).toBe('Em andamento');
    expect(text(el.querySelector('h2'))).toBe('Instalação de chuveiro');
    expect(text()).toContain('Cliente');
    expect(text()).toContain('Maria Souza');
    expect(rows()).toContain('Endereço: Rua Harmonia, 123 · Vila Madalena São Paulo / SP · CEP 05435-000');
    expect(rows().map((r) => r.replace(/\s/g, ' '))).toContain(
      'Valor combinado: R$ 150,00 O valor combinado na contratação é fixo.',
    );
    expect(rows().some((r) => r.startsWith('Quando: ') && r.endsWith('14:00'))).toBeTrue();
    expect(el.querySelector('a.finish-service__back')?.getAttribute('href')).toBe('/orders/5');
    expect(text(el.querySelector('label'))).toContain('Observações do serviço');
  });

  it('envia o valor combinado, as observações sem espaços nas pontas e sem fotos', () => {
    load();
    type('  Troquei o registro.  ');
    send();
    const request = http.expectOne(FINISH_URL);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ finalPrice: 150, providerNotes: 'Troquei o registro.', photos: [] });
    request.flush({
      id: '5',
      status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
      finalPrice: 150,
      providerFinishedAt: '2026-10-03T19:00:00.000Z',
      message: 'Conclusão enviada para o cliente confirmar.',
    });
  });

  it('regressão: manda payment.finalAmount (o order.finalPrice que o backend confere), não o estimado', () => {
    load(details({ payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 150, finalAmount: 180 } }));
    expect(rows().map((r) => r.replace(/\s/g, ' '))).toContain(
      'Valor combinado: R$ 180,00 O valor combinado na contratação é fixo.',
    );
    send();
    const request = http.expectOne(FINISH_URL);
    expect(request.request.body.finalPrice).toBe(180);
    request.flush({ id: '5', message: 'ok' });
  });

  it('sem observações: não manda providerNotes', () => {
    load();
    type('   ');
    send();
    const request = http.expectOne(FINISH_URL);
    expect(request.request.body).toEqual({ finalPrice: 150, providerNotes: undefined, photos: [] });
    request.flush({ id: '5', message: 'ok' });
  });

  it('enviando: um envio por vez, botão ocupado; sucesso mostra a confirmação e abre o pedido', () => {
    jasmine.clock().install();
    try {
      load();
      send();
      const request = http.expectOne(FINISH_URL);
      expect(submitButton()?.getAttribute('aria-busy')).toBe('true');
      send();
      http.expectNone(FINISH_URL);

      request.flush({ id: '5', message: 'Conclusão enviada para o cliente confirmar.' });
      render();
      expect(el.querySelector('form')).toBeNull();
      const alert = el.querySelector('tg-alert');
      expect(alert?.getAttribute('role')).toBe('status');
      expect(text(alert)).toContain('Conclusão enviada');
      expect(text(alert)).toContain('Conclusão enviada para o cliente confirmar.');
      expect(control('Ver detalhes do pedido')?.getAttribute('href')).toBe('/orders/5');
      expect(text(el.querySelector('tg-badge'))).toBe('Aguardando o cliente');

      expect(router.navigate).not.toHaveBeenCalled();
      jasmine.clock().tick(FINISH_REDIRECT_DELAY);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/orders', '5']);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('erro ao finalizar: mostra o motivo da API e deixa tentar de novo', () => {
    load();
    type('Tudo certo');
    send();
    http
      .expectOne(FINISH_URL)
      .flush({ message: 'Somente pedidos em andamento podem ser finalizados' }, { status: 400, statusText: 'Bad Request' });
    render();
    const alert = el.querySelector('tg-alert[role="alert"]');
    expect(text(alert)).toContain('Não foi possível enviar a conclusão');
    expect(text(alert)).toContain('Somente pedidos em andamento podem ser finalizados');
    expect(textarea()?.value).toBe('Tudo certo');
    expect(submitButton()?.disabled).toBeFalse();
    expect(router.navigate).not.toHaveBeenCalled();

    send();
    expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
    http.expectOne(FINISH_URL).flush({ id: '5', message: 'ok' });
  });

  it('erro ao finalizar: traduz a mensagem em inglês do backend e usa um texto padrão sem mensagem', () => {
    load();
    send();
    http
      .expectOne(FINISH_URL)
      .flush({ message: 'Final price must equal the agreed paid amount' }, { status: 400, statusText: 'Bad Request' });
    render();
    expect(text()).toContain('O valor combinado não confere com o pagamento deste pedido. Fale com o suporte.');

    send();
    http.expectOne(FINISH_URL).flush('erro', { status: 500, statusText: 'Erro' });
    render();
    expect(text(el.querySelector('tg-alert[role="alert"]'))).toContain('Verifique sua conexão e tente de novo.');
  });

  it('observações com mais de 1000 caracteres: erro no campo e nada é enviado', () => {
    load();
    expect(textarea()?.getAttribute('maxlength')).toBe('1000');
    fixture.componentInstance.notes.setValue('a'.repeat(1001));
    send();
    http.expectNone(FINISH_URL);
    expect(text(el.querySelector('.tg-field__error'))).toBe('Use no máximo 1.000 caracteres.');
    expect(textarea()?.getAttribute('aria-invalid')).toBe('true');
  });

  it('mostra quantos caracteres faltam', () => {
    load();
    type('Troca');
    expect(text(el.querySelector('.tg-field__hint'))).toBe('5 de 1.000 caracteres');
  });

  for (const status of ['AGENDADO', 'EM_DESLOCAMENTO', 'AGUARDANDO_CONFIRMACAO_CLIENTE', 'CONCLUIDO', 'CANCELADO']) {
    it(`status ${status}: não pode finalizar, sem formulário`, () => {
      load(details({ status }));
      expect(el.querySelector('form')).toBeNull();
      expect(text(el.querySelector('tg-empty-state'))).toContain('Este serviço não pode ser finalizado');
      expect(control('Ver detalhes do pedido')?.getAttribute('href')).toBe('/orders/5');
    });
  }

  it('sem valor combinado: aviso e envio bloqueado', () => {
    load(details({ payment: null, service: { id: '3', title: 'Instalação', category: '', estimatedPrice: 0 } }));
    expect(text()).toContain('Não encontramos o valor combinado');
    expect(rows().map((r) => r.replace(/\s/g, ' '))).toContain(
      'Valor combinado: Indisponível O valor combinado na contratação é fixo.',
    );
    expect(submitButton()?.disabled).toBeTrue();
    fixture.componentInstance.submit();
    http.expectNone(FINISH_URL);
  });

  it('erro ao carregar: alerta com "Tentar de novo" que recarrega', () => {
    load('error');
    expect(text(el.querySelector('h1'))).toBe('Finalizar serviço');
    expect(text(el.querySelector('tg-alert'))).toContain('Não foi possível carregar o pedido');
    control('Tentar de novo')!.click();
    render();
    load();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('pedido não encontrado (404): alerta sem "Tentar de novo"', () => {
    load(404);
    expect(text(el.querySelector('tg-alert'))).toContain('Este pedido não foi encontrado');
    expect(control('Tentar de novo')).toBeNull();
  });
});

describe('finishServiceView', () => {
  it('mostra o horário em São Paulo, qualquer que seja o fuso do navegador', () => {
    const view = finishServiceView(details(), new Date('2026-10-03T12:00:00.000Z'));
    expect(view.when).toEqual({ day: 'Hoje', time: '14:00' });
  });

  it('sem data marcada: "Data a combinar"', () => {
    const view = finishServiceView(details({ schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: null } }));
    expect(view.when).toEqual({ day: 'Data a combinar', time: '' });
  });

  it('só EM_ANDAMENTO pode ser finalizado', () => {
    expect(finishServiceView(details()).canFinish).toBeTrue();
    expect(finishServiceView(details({ status: 'AGENDADO' })).canFinish).toBeFalse();
  });

  it('valor: finalAmount, depois estimatedAmount, depois o preço do serviço', () => {
    expect(finishServiceView(details()).amount).toBe(150);
    expect(
      finishServiceView(details({ payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 130, finalAmount: null } })).amount,
    ).toBe(130);
    expect(finishServiceView(details({ payment: null })).amount).toBe(150);
  });
});
