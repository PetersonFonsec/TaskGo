import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import {
  disputeStatus,
  notReportableReason,
  type OrderDispute,
  ReportProblemPage,
  validateProblem,
} from './report-problem.page';

const ORDER_URL = environment.url + '/orders/5';
const DISPUTES_URL = ORDER_URL + '/disputes';

function order(status = 'AGUARDANDO_CONFIRMACAO_CLIENTE'): OrderDetails {
  return {
    id: '5',
    status,
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
    provider: { id: '17', name: 'João Pereira', photoUrl: null, ratingAvg: 4.8, ratingCount: 3, verified: true },
    client: { id: '7', name: 'Maria Souza', photoUrl: null },
    schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: '2026-10-03T17:00:00.000Z' },
    address: null,
    cancellation: null,
    payment: null,
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
  };
}

function dispute(extra: Partial<OrderDispute> = {}): OrderDispute {
  return {
    id: '11',
    orderId: '5',
    openedBy: 'CLIENTE',
    openedById: '7',
    reason: 'Serviço incompleto',
    description: 'O chuveiro ficou sem a resistência ligada.',
    status: 'OPEN',
    resolution: null,
    resolvedAt: null,
    createdAt: '2026-11-14T15:20:00.000Z',
    ...extra,
  };
}

describe('ReportProblemPage (Reportar problema)', () => {
  let fixture: ComponentFixture<ReportProblemPage>;
  let component: ReportProblemPage;
  let el: HTMLElement;
  let http: HttpTestingController;
  let params: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    params = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '5' }));
    await TestBed.configureTestingModule({
      imports: [ReportProblemPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { id: '7', type: 'CUSTOMER' } }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReportProblemPage);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const text = () => (el.textContent ?? '').replace(/\s+/g, ' ');
  const respond = async (
    details: OrderDetails | 'error' | 404 = order(),
    disputes: OrderDispute[] | 'error' = [],
  ) => {
    const orderReq = http.expectOne(ORDER_URL);
    const disputesReq = http.expectOne(DISPUTES_URL);
    if (details === 'error') orderReq.flush('erro', { status: 500, statusText: 'Erro' });
    else if (details === 404) orderReq.flush({ message: ['Pedido não encontrado'] }, { status: 404, statusText: 'Not Found' });
    else orderReq.flush(details);
    if (!disputesReq.cancelled) {
      if (disputes === 'error') disputesReq.flush('erro', { status: 500, statusText: 'Erro' });
      else disputesReq.flush(disputes);
    }
    await render();
  };
  const button = (label: string) =>
    Array.from(el.querySelectorAll<HTMLElement>('button, a')).find((b) => b.textContent?.trim() === label);
  const input = (name: string) => el.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  const type = async (name: string, value: string) => {
    const field = input(name);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await render();
  };
  const submit = async () => {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await render();
  };

  it('carregando: pede o pedido e os casos, sem mostrar o formulário', () => {
    expect(component.loading()).toBeTrue();
    expect(el.querySelector('form')).toBeNull();
    http.expectOne(ORDER_URL);
    http.expectOne(DISPUTES_URL);
  });

  it('mostra o formulário com título, pedido e limites do DTO', async () => {
    await respond();

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(el.querySelector('h1')?.textContent).toContain('Reportar problema');
    expect(text()).toContain('Pedido #5 · Instalação de chuveiro');
    expect(text()).toContain('Abrir um caso não solicita reembolso automático');
    expect(input('reason').getAttribute('maxlength')).toBe('120');
    expect(input('description').getAttribute('maxlength')).toBe('2000');
    expect(el.querySelector('label[for="' + input('reason').id + '"]')?.textContent).toContain('Motivo');
    expect(button('Voltar ao pedido')?.getAttribute('href')).toBe('/orders/5');
  });

  it('valida antes de enviar e não chama a API com campos inválidos', async () => {
    await respond();

    await submit();
    expect(text()).toContain('Informe o motivo.');
    expect(text()).toContain('Conte o que aconteceu.');
    expect(input('reason').getAttribute('aria-invalid')).toBe('true');

    await type('reason', ' ab ');
    await type('description', 'curto');
    await submit();
    expect(text()).toContain('Use pelo menos 3 caracteres.');
    expect(text()).toContain('Use pelo menos 10 caracteres.');
    http.expectNone(DISPUTES_URL);
  });

  it('envia o problema (sem espaços nas pontas), mostra o sucesso e o caso aberto', async () => {
    await respond();
    await type('reason', '  Serviço incompleto ');
    await type('description', ' O chuveiro ficou sem a resistência ligada. ');
    expect(text()).toContain('44/2000');
    await submit();

    const post = http.expectOne({ method: 'POST', url: DISPUTES_URL });
    expect(post.request.body).toEqual({
      reason: 'Serviço incompleto',
      description: 'O chuveiro ficou sem a resistência ligada.',
    });
    expect(component.sending()).toBeTrue();
    expect(el.querySelector('button[type="submit"]')?.getAttribute('aria-busy')).toBe('true');

    post.flush(dispute());
    await render();

    expect(text()).toContain('Problema enviado');
    expect(el.querySelector('tg-alert.tg-alert--success')).not.toBeNull();
    expect(el.querySelector('form')).toBeNull();
    // O sucesso já explica: sem o aviso de caso aberto repetido.
    expect(text()).not.toContain('Já existe um problema em análise neste pedido');
    expect(text()).toContain('aberto por você');

    // Recarrega os casos depois do envio, como antes.
    http.expectOne({ method: 'GET', url: DISPUTES_URL }).flush([dispute({ status: 'UNDER_REVIEW' })]);
    await render();
    expect(el.querySelector('.case tg-badge')?.textContent).toContain('Em análise');
  });

  it('falha ao enviar: mostra a mensagem da API (lista do filtro) e mantém o formulário', async () => {
    await respond();
    await type('reason', 'Serviço incompleto');
    await type('description', 'O chuveiro ficou sem a resistência ligada.');
    await submit();

    http
      .expectOne({ method: 'POST', url: DISPUTES_URL })
      .flush(
        { statusCode: 400, message: ['Problemas podem ser reportados durante ou após o atendimento, antes da confirmação'] },
        { status: 400, statusText: 'Bad Request' },
      );
    await render();

    expect(component.sending()).toBeFalse();
    expect(text()).toContain('Não foi possível enviar o problema');
    expect(text()).toContain('Problemas podem ser reportados durante ou após o atendimento, antes da confirmação');
    expect((input('reason') as HTMLInputElement).value).toBe('Serviço incompleto');
  });

  it('falha de rede ao enviar: texto genérico', async () => {
    await respond();
    await type('reason', 'Serviço incompleto');
    await type('description', 'O chuveiro ficou sem a resistência ligada.');
    await submit();
    http.expectOne({ method: 'POST', url: DISPUTES_URL }).error(new ProgressEvent('error'));
    await render();
    expect(text()).toContain('Verifique sua conexão e tente de novo.');
  });

  it('caso já aberto: sem formulário, com o caso e o contato do suporte', async () => {
    await respond(order(), [dispute({ status: 'UNDER_REVIEW', openedBy: 'PRESTADOR', openedById: '17' })]);

    expect(el.querySelector('form')).toBeNull();
    expect(text()).toContain('Já existe um problema em análise neste pedido');
    expect(text()).toContain('aberto pelo prestador');
    expect(button('Falar com o suporte')?.getAttribute('href')).toBe('mailto:suporte@proxi.com.br');
    expect(el.querySelectorAll('.case').length).toBe(1);
    expect(text()).toContain('Serviço incompleto');
  });

  it('casos encerrados: mostram a resposta e não impedem um caso novo', async () => {
    await respond(order('EM_ANDAMENTO'), [
      dispute({ status: 'RESOLVED', resolution: 'O prestador voltou e concluiu.', resolvedAt: '2026-11-15T13:00:00.000Z' }),
    ]);

    expect(el.querySelector('form')).not.toBeNull();
    expect(el.querySelector('.case tg-badge')?.textContent).toContain('Resolvido');
    expect(text()).toContain('Resposta da equipe · 15/11/2026 às 10:00');
    expect(text()).toContain('O prestador voltou e concluiu.');
    expect(text()).toContain('em 14/11/2026 às 12:20');
  });

  it('pedido que não permite reportar: estado vazio com o motivo, sem formulário', async () => {
    await respond(order('AGENDADO'));

    expect(el.querySelector('form')).toBeNull();
    expect(el.querySelector('tg-empty-state h2')?.textContent).toContain('O atendimento ainda não começou');
    expect(button('Falar com o suporte')).toBeTruthy();
  });

  it('erro ao carregar: alerta com "Tentar de novo" que recarrega', async () => {
    await respond('error');

    expect(text()).toContain('Não foi possível carregar o pedido');
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelectorAll('h1').length).toBe(1);
    (button('Tentar de novo') as HTMLButtonElement).click();
    await render();
    await respond();
    expect(el.querySelector('form')).not.toBeNull();
  });

  it('falha só nos casos também é erro (não mostra formulário sem saber dos casos)', async () => {
    await respond(order(), 'error');
    expect(el.querySelector('form')).toBeNull();
    expect(text()).toContain('Não foi possível carregar o pedido');
  });

  it('pedido inexistente ou de outra pessoa: 404', async () => {
    await respond(404);
    expect(text()).toContain('Este pedido não foi encontrado');
    expect(button('Tentar de novo')).toBeUndefined();
  });

  it('troca de pedido na rota recarrega e descarta o estado anterior', async () => {
    await respond();
    await type('reason', 'Serviço incompleto');
    params.next(convertToParamMap({ id: '6' }));
    await render();
    http.expectOne(environment.url + '/orders/6').flush({ ...order(), id: '6' });
    http.expectOne(environment.url + '/orders/6/disputes').flush([]);
    await render();
    expect(component.draft.reason).toBe('');
    expect(text()).toContain('Pedido #6');
  });
});

describe('Reportar problema: regras', () => {
  it('validateProblem segue o OpenDisputeDto (3..120 e 10..2000, sem espaços nas pontas)', () => {
    expect(validateProblem({ reason: 'abc', description: '0123456789' })).toEqual({});
    expect(validateProblem({ reason: '  ab  ', description: '012345678 ' }).reason).toBe('Use pelo menos 3 caracteres.');
    expect(validateProblem({ reason: 'x'.repeat(121), description: 'y'.repeat(2001) })).toEqual({
      reason: 'Use até 120 caracteres.',
      description: 'Use até 2.000 caracteres.',
    });
  });

  it('só EM_ANDAMENTO e AGUARDANDO_CONFIRMACAO_CLIENTE aceitam caso novo', () => {
    expect(notReportableReason('EM_ANDAMENTO')).toBeNull();
    expect(notReportableReason('AGUARDANDO_CONFIRMACAO_CLIENTE')).toBeNull();
    for (const status of ['AGENDADO', 'CONCLUIDO', 'CANCELADO', 'DISPUTA', 'QUALQUER']) {
      expect(notReportableReason(status)).not.toBeNull();
    }
  });

  it('OPEN e UNDER_REVIEW contam como abertos', () => {
    expect(disputeStatus('OPEN').open).toBeTrue();
    expect(disputeStatus('UNDER_REVIEW').open).toBeTrue();
    expect(disputeStatus('RESOLVED').open).toBeFalse();
    expect(disputeStatus('REJECTED')).toEqual({ label: 'Encerrado', tone: 'neutral', open: false });
    expect(disputeStatus('NOVO').open).toBeFalse();
  });
});
