import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { environment } from '@environments/environment';
import { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { PendingApproval, pendingApprovalOutcome } from './pending-approval';

const details = (extra: Partial<OrderDetails> = {}): OrderDetails => ({
  id: '5',
  status: 'AGUARDANDO_APROVACAO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
  provider: { id: '17', name: 'João', photoUrl: null },
  client: { id: '7', name: 'Maria', photoUrl: null },
  schedule: {
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    scheduledFor: '2026-10-03T13:00:00.000Z',
    scheduledEnd: '2026-10-03T15:00:00.000Z',
  },
  address: {
    street: 'Rua das Flores',
    number: '10',
    complement: null,
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000-000',
  },
  distanceKm: 3.2,
  providerEarnings: { grossAmount: 150, feePct: 0.12, feeAmount: 18, netAmount: 132 },
  cancellation: null,
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
  ...extra,
});

const DETAILS_URL = `${environment.url}/orders/5`;
const CONFIRM_URL = `${environment.url}/order/5/provider/17/confirm`;
const CANCEL_URL = `${environment.url}/order/5/provider/17/cancel`;

describe('PendingApproval', () => {
  let fixture: ComponentFixture<PendingApproval>;
  let component: PendingApproval;
  let http: HttpTestingController;
  let el: HTMLElement;

  async function setup(queryParams: Record<string, string> = {}) {
    await TestBed.configureTestingModule({
      imports: [PendingApproval],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ orderId: '5' }),
            snapshot: { queryParamMap: convertToParamMap(queryParams) },
          },
        },
        {
          provide: UserLoggedService,
          useValue: { user: () => ({ user: { id: '17', type: 'PRESTADOR' } }) },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PendingApproval);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  async function render() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  /** Carrega a solicitação com a resposta dada. */
  async function load(order: OrderDetails = details()) {
    http.expectOne(DETAILS_URL).flush(order);
    await render();
  }

  const text = (node: Element | null = el) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const button = (label: string) =>
    [...el.querySelectorAll<HTMLElement>('button, a')].find((item) => text(item) === label) ?? null;
  const dialog = () => el.querySelector('dialog') as HTMLDialogElement;

  afterEach(() => {
    if (dialog()?.open) dialog().close();
    http.verify();
  });

  it('mostra quando, onde, os valores e quando a solicitação chegou', async () => {
    await setup();
    await load();
    const content = text();
    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(text(el.querySelector('h1'))).toBe('Instalação de chuveiro');
    expect(content).toContain('recebida há 2 h');
    expect(content).toContain('Elétrica · Cliente: Maria');
    expect(content).toContain(component.formatDate('2026-10-03T13:00:00.000Z'));
    // 13:00 UTC é 10:00 em São Paulo, qualquer que seja o fuso da máquina.
    expect(content).toContain('10:00 às 12:00');
    expect(content).toContain('Rua das Flores, 10');
    expect(content).toContain('Centro · São Paulo/SP · CEP 01000-000');
    expect(content).toContain('3,2 km');
    expect(content).toContain('R$ 150,00');
    expect(content).toContain('R$ 132,00');
    expect(content).toContain('− R$ 18,00');
    expect(content).toContain('Taxa da plataforma (12%)');
    expect(button('Aceitar serviço')).not.toBeNull();
    expect(button('Recusar')).not.toBeNull();
  });

  it('formata a data no horário de São Paulo', async () => {
    await setup();
    await load();
    // 02:00 UTC do dia 4 ainda é dia 3 em São Paulo.
    expect(component.formatDate('2026-10-04T02:00:00.000Z')).toBe('Sábado, 03 de outubro');
    expect(component.formatDate(null)).toBe('A combinar');
    expect(component.formatTimeRange(null, null)).toBe('A combinar');
  });

  it('não mostra contato do cliente', async () => {
    await setup();
    await load();
    expect(text()).not.toMatch(/telefone|e-?mail/i);
  });

  it('mostra o prazo para responder', async () => {
    await setup();
    await load(details({ expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() }));
    expect(text()).toContain('Responda até');
  });

  it('fica carregando até a API responder', async () => {
    await setup();
    expect(component.loading()).toBeTrue();
    expect(el.querySelector('h1')).toBeNull();
    expect(button('Aceitar serviço')).toBeNull();
    await load();
    expect(component.loading()).toBeFalse();
  });

  it('mostra a falha ao carregar e tenta de novo', async () => {
    await setup();
    http.expectOne(DETAILS_URL).flush(null, { status: 500, statusText: 'Erro' });
    await render();
    expect(text()).toContain('Não foi possível carregar a solicitação');
    expect(el.querySelector('tg-alert[role="alert"]')).not.toBeNull();

    button('Tentar de novo')!.click();
    await load();
    expect(text()).toContain('Instalação de chuveiro');
  });

  it('solicitação inexistente não oferece tentar de novo', async () => {
    await setup();
    http.expectOne(DETAILS_URL).flush(null, { status: 404, statusText: 'Not Found' });
    await render();
    expect(text()).toContain('Esta solicitação não foi encontrada');
    expect(button('Tentar de novo')).toBeNull();
  });

  it('aceita a solicitação e troca as ações pelo aviso de sucesso', async () => {
    await setup();
    await load();
    button('Aceitar serviço')!.click();
    await render();
    expect(component.submitting()).toBe('accept');

    // Um envio por vez.
    component.accept();
    const request = http.expectOne(CONFIRM_URL);
    expect(request.request.method).toBe('POST');
    request.flush({});
    await render();

    expect(component.submitting()).toBeNull();
    expect(text()).toContain('Solicitação aceita');
    expect(text()).toContain('O cliente foi avisado e já pode seguir para o pagamento.');
    expect(button('Aceitar serviço')).toBeNull();
    expect(button('Ver detalhes do pedido')?.getAttribute('href')).toBe('/orders/5');
  });

  it('mostra o erro ao aceitar uma solicitação que já não aguarda resposta, com Atualizar', async () => {
    await setup();
    await load();
    component.accept();
    http.expectOne(CONFIRM_URL).flush(null, { status: 400, statusText: 'Bad Request' });
    await render();

    expect(text()).toContain('Esta solicitação não pode mais ser respondida');
    expect(component.submitting()).toBeNull();
    button('Atualizar')!.click();
    await load(details({ status: 'AGUARDANDO_PAGAMENTO' }));
    expect(text()).toContain('Você aceitou esta solicitação');
    expect(button('Aceitar serviço')).toBeNull();
  });

  it('mostra a falha de rede ao aceitar, sem Atualizar', async () => {
    await setup();
    await load();
    component.accept();
    http.expectOne(CONFIRM_URL).flush(null, { status: 500, statusText: 'Erro' });
    await render();
    expect(text()).toContain('Não foi possível enviar sua resposta');
    expect(button('Atualizar')).toBeNull();
    expect(button('Aceitar serviço')).not.toBeNull();
  });

  it('recusar abre a confirmação no diálogo, sem enviar nada', async () => {
    await setup();
    await load();
    button('Recusar')!.click();
    await render();
    expect(dialog().open).toBeTrue();
    expect(text(dialog())).toContain('Recusar esta solicitação?');
    expect(text(dialog())).toContain('A recusa não pode ser desfeita');
    expect(text(dialog())).toContain('Fora da minha área de atendimento');

    button('Voltar')!.click();
    await render();
    expect(dialog().open).toBeFalse();
    http.expectNone(CANCEL_URL);
  });

  it('pede o motivo antes de recusar', async () => {
    await setup();
    await load();
    component.openDecline();
    await render();
    button('Recusar solicitação')!.click();
    await render();
    http.expectNone(CANCEL_URL);
    expect(text(dialog())).toContain('Escolha o motivo da recusa.');
    expect(dialog().open).toBeTrue();
  });

  it('recusa com o motivo e a observação, sem espaços nas pontas', async () => {
    await setup({ recusar: '1' });
    await load();
    expect(dialog().open).toBeTrue();

    const other = [...dialog().querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
      (input) => input.value === 'OTHER',
    )!;
    other.click();
    await render();
    const textarea = dialog().querySelector('textarea')!;
    textarea.value = '  Estarei viajando  ';
    textarea.dispatchEvent(new Event('input'));
    await render();

    button('Recusar solicitação')!.click();
    const request = http.expectOne(CANCEL_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ reason: 'OTHER', note: 'Estarei viajando' });
    request.flush({});
    await render();

    expect(dialog().open).toBeFalse();
    expect(text()).toContain('Solicitação recusada');
    expect(text()).toContain('Motivo: Outro motivo');
    expect(text()).toContain('Estarei viajando');
    expect(button('Recusar')).toBeNull();
  });

  it('não envia observação vazia nem a de outro motivo', async () => {
    await setup();
    await load();
    component.openDecline();
    component.chooseReason('OTHER');
    component.note.set('   ');
    component.chooseReason('NO_AVAILABILITY');
    component.decline();
    const request = http.expectOne(CANCEL_URL);
    expect(request.request.body).toEqual({ reason: 'NO_AVAILABILITY' });
    request.flush({});
    await render();
  });

  it('mostra no diálogo a falha ao recusar e mantém o diálogo aberto', async () => {
    await setup();
    await load();
    component.openDecline();
    component.chooseReason('OUT_OF_AREA');
    component.decline();
    await render();
    expect(component.submitting()).toBe('decline');
    http.expectOne(CANCEL_URL).flush(null, { status: 500, statusText: 'Erro' });
    await render();

    expect(dialog().open).toBeTrue();
    expect(text(dialog())).toContain('Não foi possível enviar sua resposta');
    expect(component.submitting()).toBeNull();
    // O erro da recusa fica só no diálogo.
    expect(el.querySelectorAll('tg-alert[role="alert"]').length).toBe(1);
  });

  it('não abre a recusa pelo link quando a solicitação já foi respondida', async () => {
    await setup({ recusar: '1' });
    await load(details({ status: 'AGENDADO' }));
    expect(dialog().open).toBeFalse();
    expect(text()).toContain('Você aceitou esta solicitação');
    expect(button('Recusar')).toBeNull();
  });

  it('mostra a solicitação recusada com o motivo', async () => {
    await setup();
    await load(
      details({
        status: 'CANCELADO',
        cancellation: {
          reason: 'NO_AVAILABILITY',
          label: 'Sem horário disponível',
          note: 'Agenda cheia',
          canceledAt: null,
        },
      }),
    );
    expect(text()).toContain('Você recusou esta solicitação');
    expect(text()).toContain('Motivo: Sem horário disponível');
    expect(text()).toContain('Agenda cheia');
    expect(button('Aceitar serviço')).toBeNull();
  });

  it('mostra a solicitação expirada', async () => {
    await setup();
    await load(
      details({
        status: 'CANCELADO',
        timeline: [
          { type: 'EXPIRED', title: 'Pedido expirado', date: new Date().toISOString(), completed: true },
        ],
      }),
    );
    expect(text()).toContain('Esta solicitação expirou');
    expect(text()).not.toContain('Responda até');
    expect(button('Aceitar serviço')).toBeNull();
  });
});

describe('pendingApprovalOutcome', () => {
  it('não tem desfecho enquanto aguarda resposta', () => {
    expect(pendingApprovalOutcome(details())).toBeNull();
  });

  it('distingue expirada, recusada, cancelada e aceita', () => {
    expect(
      pendingApprovalOutcome(
        details({
          status: 'CANCELADO',
          timeline: [{ type: 'EXPIRED', title: 'Expirado', date: '', completed: true }],
        }),
      )?.title,
    ).toBe('Esta solicitação expirou');
    expect(
      pendingApprovalOutcome(
        details({
          status: 'CANCELADO',
          cancellation: { reason: 'OTHER', label: 'Outro motivo', note: '  ', canceledAt: null },
        }),
      ),
    ).toEqual(jasmine.objectContaining({ title: 'Você recusou esta solicitação', note: null }));
    expect(pendingApprovalOutcome(details({ status: 'CANCELADO' }))?.title).toBe(
      'Esta solicitação foi cancelada',
    );
    expect(pendingApprovalOutcome(details({ status: 'AGUARDANDO_PAGAMENTO' }))?.tone).toBe('success');
  });
});
