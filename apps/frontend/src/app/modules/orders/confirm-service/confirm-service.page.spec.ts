import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ConfirmServicePage } from './confirm-service.page';
import { confirmServiceView, dateTime } from './confirm-service.view';

const DETAILS_URL = environment.url + '/orders/5';
const CONFIRM_URL = environment.url + '/orders/5/confirm';

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '5',
    status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
    provider: { id: '17', name: 'João Pereira', photoUrl: null, ratingAvg: 4.8, ratingCount: 3, verified: true },
    client: { id: '7', name: 'Maria Souza', photoUrl: null },
    schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: '2026-10-03T17:00:00.000Z' },
    address: {
      street: 'Rua Harmonia',
      number: '123',
      complement: 'apto 41',
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      cep: '05435-000',
    },
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
    review: null,
    timeline: [],
    completion: { providerFinishedAt: '2026-10-03T19:30:00.000Z', providerNotes: 'Troquei o registro.' },
    photos: [
      { id: '1', url: 'https://example.com/depois.jpg', type: 'AFTER' },
      { id: '2', url: 'https://example.com/nota.jpg', type: 'RECEIPT' },
    ],
    ...extra,
  };
}

describe('ConfirmServicePage (Confirmar conclusão)', () => {
  let fixture: ComponentFixture<ConfirmServicePage>;
  let component: ConfirmServicePage;
  let el: HTMLElement;
  let http: HttpTestingController;
  let params: BehaviorSubject<ParamMap>;

  async function setup(userId: string | null = '7') {
    params = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '5' }));
    await TestBed.configureTestingModule({
      imports: [ConfirmServicePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: UserLoggedService, useValue: { user: () => (userId ? { user: { id: userId, type: 'CLIENTE' } } : null) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ConfirmServicePage);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  const render = () => fixture.detectChanges();
  const text = (node: Element | null = el) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const rows = () =>
    [...el.querySelectorAll('dl > div')].map((row) => `${text(row.querySelector('dt'))}: ${text(row.querySelector('dd'))}`);
  const byText = (label: string) => [...el.querySelectorAll<HTMLElement>('button, a')].find((b) => text(b) === label) ?? null;
  const confirmButton = () => [...el.querySelectorAll<HTMLButtonElement>('tg-dialog button')].at(-1) ?? null;
  const dialogOpen = () => !!el.querySelector<HTMLDialogElement>('tg-dialog dialog')?.open;
  const load = (order: OrderDetails = details()) => {
    http.expectOne(DETAILS_URL).flush(order);
    render();
  };
  const openAndConfirm = () => {
    byText('Confirmar conclusão')?.click();
    render();
    byText('Confirmar')?.click();
    render();
    return http.expectOne(CONFIRM_URL);
  };

  it('carregando: busca o pedido e não mostra o conteúdo antes da resposta', async () => {
    await setup();
    expect(component.loading()).toBeTrue();
    expect(el.querySelector('.tg-loading__body')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('h1')).toBeNull();
    load();
    expect(component.loading()).toBeFalse();
    expect(text(el.querySelector('h1'))).toBe('Confirmar conclusão');
  });

  it('aguardando: resumo, prestador, valor fixo combinado, pagamento e fotos', async () => {
    await setup();
    load();

    expect(el.querySelectorAll('h1').length).toBe(1);
    expect(text(el.querySelector('.confirm-service__eyebrow'))).toBe('Pedido #5 · Elétrica');
    expect(text(el.querySelector('tg-badge'))).toBe('Aguardando sua confirmação');
    expect(text()).toContain('João Pereira');
    expect(text()).toContain('4,8 (3 avaliações)');
    expect(rows()).toContain('Serviço contratado: Instalação de chuveiro');
    expect(rows()).toContain('Agendamento: 3 de outubro de 2026 às 14:00');
    expect(rows()).toContain('Endereço: Rua Harmonia, 123, apto 41 · Vila Madalena · São Paulo / SP');
    expect(rows()).toContain('Conclusão informada em: 3 de outubro de 2026 às 16:30');
    expect(rows()).toContain('Observações do prestador: Troquei o registro.');
    expect(text(el.querySelector('.confirm-service__total-value'))).toBe('R$ 120,00');
    expect(rows()).toContain('Valor estimado: R$ 120,00');
    expect(rows().some((row) => row.startsWith('Diferença'))).toBeFalse();
    expect(rows()).toContain('Forma de pagamento: Pix');
    expect(rows()).toContain('Situação do pagamento: Pago');
    expect(el.querySelector('.confirm-service__adjusted')).toBeNull();
    const photos = [...el.querySelectorAll<HTMLAnchorElement>('.confirm-service__photo')];
    expect(photos.map((a) => text(a))).toEqual(['Depois', 'Comprovante']);
    expect(photos[0].target).toBe('_blank');
    expect(byText('Reportar problema')?.getAttribute('href')).toBe('/orders/5/report-problem');
    expect(byText('Voltar ao pedido')?.getAttribute('href')).toBe('/orders/5');
  });

  it('sem ajuste, sem fotos e sem observações: sem diferença nem aviso, com estado vazio', async () => {
    await setup();
    load(
      details({
        payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
        priceAdjustmentReason: null,
        completion: { providerFinishedAt: '2026-10-03T19:30:00.000Z', providerNotes: null },
        photos: [],
      }),
    );
    expect(rows().some((row) => row.startsWith('Diferença'))).toBeFalse();
    expect(el.querySelector('.confirm-service__adjusted')).toBeNull();
    expect(text(el.querySelector('tg-empty-state'))).toContain('Nenhuma foto enviada');
    expect(rows()).toContain('Observações do prestador: O prestador não deixou observações.');
  });

  it('confirma pelo diálogo: um envio por vez, PATCH /orders/:id/confirm e o estado de confirmado', async () => {
    await setup();
    load();

    byText('Confirmar conclusão')?.click();
    render();
    expect(dialogOpen()).toBeTrue();
    expect(text(el.querySelector('tg-dialog'))).toContain('O pagamento de R$ 120,00 é liberado para João Pereira.');

    byText('Confirmar')?.click();
    render();
    const request = http.expectOne(CONFIRM_URL);
    expect(request.request.method).toBe('PATCH');
    expect(component.confirming()).toBeTrue();
    expect(confirmButton()?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('tg-dialog dialog')?.getAttribute('aria-busy')).toBe('true');

    confirmButton()?.click();
    render();
    http.expectNone(CONFIRM_URL);

    request.flush({
      id: '5',
      status: 'CONCLUIDO',
      clientConfirmedAt: '2026-10-03T20:00:00.000Z',
      payment: { status: 'PAGO', paidAt: '2026-10-03T20:00:00.000Z' },
      message: 'Serviço confirmado com sucesso.',
    });
    render();
    await fixture.whenStable();

    expect(el.querySelector('tg-dialog')).toBeNull();
    expect(text(el.querySelector('.confirm-service__done-title'))).toBe('Serviço confirmado');
    expect(text()).toContain('Serviço confirmado com sucesso.');
    expect(text(el.querySelector('tg-badge'))).toBe('Concluído');
    expect(byText('Avaliar atendimento')?.getAttribute('href')).toBe('/orders/5/review');
    expect(byText('Confirmar conclusão')).toBeNull();
    expect(document.activeElement).toBe(el.querySelector('.confirm-service__done-title'));
  });

  it('erro ao confirmar: fecha o diálogo e mostra a mensagem da API; dá para tentar de novo', async () => {
    await setup();
    load();

    openAndConfirm().flush({ message: 'Pagamento ainda não confirmado' }, { status: 400, statusText: 'Bad Request' });
    render();

    expect(dialogOpen()).toBeFalse();
    const alert = el.querySelector('tg-alert[role="alert"]');
    expect(text(alert)).toContain('Não foi possível confirmar a conclusão');
    expect(text(alert)).toContain('Pagamento ainda não confirmado');
    expect(component.confirming()).toBeFalse();

    openAndConfirm().flush({ id: '5', status: 'CONCLUIDO', message: 'Serviço confirmado com sucesso.' });
    render();
    expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
    expect(text()).toContain('Serviço confirmado');
  });

  it('erro ao confirmar sem mensagem: texto padrão', async () => {
    await setup();
    load();
    openAndConfirm().flush('erro', { status: 500, statusText: 'Erro' });
    render();
    expect(text(el.querySelector('tg-alert[role="alert"]'))).toContain(
      'Não foi possível confirmar o serviço. Tente de novo.',
    );
  });

  it('"Voltar" fecha o diálogo sem enviar', async () => {
    await setup();
    load();
    byText('Confirmar conclusão')?.click();
    render();
    byText('Voltar')?.click();
    render();
    expect(dialogOpen()).toBeFalse();
    http.expectNone(CONFIRM_URL);
  });

  it('status que não permite confirmar: aviso com o status real e sem o botão de confirmar', async () => {
    await setup();
    load(details({ status: 'EM_ANDAMENTO' }));
    expect(text(el.querySelector('tg-badge'))).toBe('Em andamento');
    expect(text(el.querySelector('tg-alert'))).toContain('Este pedido não está aguardando sua confirmação');
    expect(byText('Confirmar conclusão')).toBeNull();
    expect(byText('Reportar problema')).toBeNull();
    expect(byText('Ver detalhes do pedido')?.getAttribute('href')).toBe('/orders/5');
  });

  it('pedido já concluído e sem avaliação: oferece "Avaliar atendimento"', async () => {
    await setup();
    load(details({ status: 'CONCLUIDO' }));
    expect(text(el.querySelector('tg-alert'))).toContain('Este serviço já foi confirmado');
    expect(byText('Avaliar atendimento')?.getAttribute('href')).toBe('/orders/5/review');
  });

  it('pedido em disputa: pede para aguardar a análise', async () => {
    await setup();
    load(details({ status: 'DISPUTA' }));
    expect(text(el.querySelector('tg-alert'))).toContain('Aguarde a análise do problema reportado');
    expect(byText('Confirmar conclusão')).toBeNull();
  });

  it('usa a elegibilidade da API e esconde a confirmação quando Pix está bloqueado', async () => {
    await setup();
    load(details({
      confirmationEligibility: {
        hasOpenDispute: false,
        canConfirm: false,
        reason: 'A confirmação está disponível apenas para Pix neste MVP.',
      },
    }));
    expect(text(el.querySelector('tg-alert'))).toContain('A confirmação está disponível apenas para Pix neste MVP.');
    expect(byText('Confirmar conclusão')).toBeNull();
  });

  it('a elegibilidade de disputa mostra o motivo retornado pela API', async () => {
    await setup();
    load(details({
      confirmationEligibility: { hasOpenDispute: true, canConfirm: false, reason: 'Aguarde a análise da disputa.' },
    }));
    expect(text(el.querySelector('tg-alert'))).toContain('Aguarde a análise da disputa.');
    expect(byText('Confirmar conclusão')).toBeNull();
  });

  it('quem não é o cliente do pedido não confirma', async () => {
    await setup('99');
    load();
    expect(text(el.querySelector('tg-alert'))).toContain('Apenas o cliente deste pedido pode confirmar a conclusão.');
    expect(byText('Confirmar conclusão')).toBeNull();
  });

  it('erro ao carregar: alerta com "Tentar de novo", que busca de novo', async () => {
    await setup();
    http.expectOne(DETAILS_URL).flush('erro', { status: 500, statusText: 'Erro' });
    render();
    expect(text(el.querySelector('tg-alert'))).toContain('Não foi possível carregar o pedido');
    byText('Tentar de novo')?.click();
    render();
    load();
    expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
    expect(byText('Confirmar conclusão')).not.toBeNull();
  });

  it('404: pedido não encontrado, sem "Tentar de novo"', async () => {
    await setup();
    http.expectOne(DETAILS_URL).flush('erro', { status: 404, statusText: 'Not Found' });
    render();
    expect(text(el.querySelector('tg-alert'))).toContain('Este pedido não foi encontrado');
    expect(byText('Tentar de novo')).toBeNull();
  });

  it('403: confirmação indisponível', async () => {
    await setup();
    http.expectOne(DETAILS_URL).flush('erro', { status: 403, statusText: 'Forbidden' });
    render();
    expect(text(el.querySelector('tg-alert'))).toContain('Apenas o cliente deste pedido pode confirmar a conclusão.');
  });

  it('troca de pedido na rota: busca o novo e ignora a confirmação do anterior', async () => {
    await setup();
    load();
    const pending = openAndConfirm();
    params.next(convertToParamMap({ id: '6' }));
    render();
    pending.flush({ id: '5', status: 'CONCLUIDO', message: 'ok' });
    http.expectOne(environment.url + '/orders/6').flush(details({ id: '6' }));
    render();
    expect(component.confirmed()).toBeNull();
    expect(text(el.querySelector('.confirm-service__eyebrow'))).toBe('Pedido #6 · Elétrica');
  });
});

describe('confirmServiceView', () => {
  // O Intl separa "R$" do número com espaço não separável.
  const plain = (rows: { label: string; value: string }[]) =>
    rows.map((row) => ({ label: row.label, value: row.value.replace(/\s/g, ' ') }));

  it('mantém o preço combinado quando a API devolve um valor final divergente', () => {
    const view = confirmServiceView(
      details({ payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 100 } }),
    );
    expect(view.finalPrice.replace(/\s/g, ' ')).toBe('R$ 120,00');
    expect(plain(view.prices)).not.toContain(jasmine.objectContaining({ label: 'Diferença' }));
  });

  it('sem pagamento: usa o preço estimado do serviço e não inventa forma nem situação', () => {
    const view = confirmServiceView(details({ payment: null }));
    expect(view.finalPrice.replace(/\s/g, ' ')).toBe('R$ 120,00');
    expect(view.payment).toEqual([]);
  });

  it('situação de pagamento desconhecida: "Em atualização", nunca o código cru', () => {
    const view = confirmServiceView(
      details({ payment: { method: 'PIX', status: 'XYZ', estimatedAmount: 120, finalAmount: 150 } }),
    );
    expect(view.payment).toContain({ label: 'Situação do pagamento', value: 'Em atualização' });
  });

  it('datas no horário de Brasília; inválidas somem', () => {
    expect(dateTime('2026-10-03T02:30:00.000Z')).toBe('2 de outubro de 2026 às 23:30');
    expect(dateTime('não é data')).toBeNull();
    expect(dateTime(null)).toBeNull();
  });
});
