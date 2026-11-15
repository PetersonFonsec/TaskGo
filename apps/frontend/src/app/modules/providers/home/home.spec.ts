import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';
import { environment } from '@environments/environment';

import { TgClock } from '@shared/design-system/tg-clock';
import { Order } from '@shared/service/order/order';
import { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ProviderHomeData } from './data';
import { ProviderHomePage } from './home';

const NOW = new Date('2026-11-18T12:00:00');
const TODAY_14H = new Date('2026-11-18T14:00:00').toISOString();
const TOMORROW = new Date('2026-11-19T09:00:00').toISOString();

function order(id: string, status: string, extra: Partial<OrderModel> = {}): OrderModel {
  return {
    id,
    clientId: 'c-' + id,
    serviceId: 's-' + id,
    status,
    scheduledFor: TOMORROW,
    client: { name: 'Marina Souza' },
    service: { title: 'Serviço ' + id },
    addressSnap: { street: 'Rua Harmonia', number: '123', neighborhood: 'Vila Madalena' },
    ...extra,
  } as OrderModel;
}

const home: ProviderHomeData = {
  earnings: {
    today: 180,
    month: 3240,
    previousMonth: 2900,
    lastSixMonths: [
      { month: 'Jun', revenue: 1000 },
      { month: 'Jul', revenue: 1500 },
      { month: 'Ago', revenue: 1300 },
      { month: 'Set', revenue: 2000 },
      { month: 'Out', revenue: 2900 },
      { month: 'Nov', revenue: 3240 },
    ],
  },
  services: { completedTotal: 48, completedThisWeek: 3 },
  rating: { average: 4.9, count: 37 },
  pendingRequests: [],
  activeOrders: [],
  recentServices: [
    { id: '90', clientName: 'Carlos Lima', service: 'Conserto de tomada', completedAt: '2026-11-02T15:00:00', amount: 72, rating: 5 },
    { id: '91', clientName: 'Ana Souza', service: 'Limpeza pós-obra', completedAt: '2026-10-25T15:00:00', amount: 216, rating: null },
  ],
  insights: {
    mostRequestedService: 'Limpeza residencial',
    averageTicket: 165,
    mostServedNeighborhood: 'Pinheiros',
    monthlyGrowth: 12,
  },
};

describe('ProviderHomePage', () => {
  let component: ProviderHomePage;
  let fixture: ComponentFixture<ProviderHomePage>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let session: WritableSignal<unknown>;
  const endpoint = `${environment.url}/auth/provider-home`;
  const orderService = {
    getOrderByProvider: jasmine.createSpy('getOrderByProvider'),
    updateOrderStatus: jasmine.createSpy('updateOrderStatus'),
    confirmOrder: jasmine.createSpy('confirmOrder'),
  };

  async function setup(
    orders: Observable<OrdersResponse> = of([]),
    user: unknown = { user: { id: '17', name: 'Bruno Alves' } },
  ) {
    orderService.getOrderByProvider.and.returnValue(orders);
    session.set(user);
    await TestBed.configureTestingModule({
      imports: [ProviderHomePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Order, useValue: orderService },
        { provide: UserLoggedService, useValue: { user: session } },
        { provide: TgClock, useValue: { now: signal(NOW) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProviderHomePage);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  function flushHome(body: object = home) {
    http.expectOne(endpoint).flush(body);
    fixture.detectChanges();
  }

  const text = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

  beforeEach(() => {
    session = signal<unknown>(undefined);
    orderService.getOrderByProvider.calls.reset();
    orderService.updateOrderStatus.calls.reset();
    orderService.updateOrderStatus.and.returnValue(of({}));
    orderService.confirmOrder.calls.reset();
  });

  afterEach(() => http.verify());

  describe('saudação', () => {
    it('usa o primeiro nome e resume o dia com a agenda', async () => {
      await setup(
        of([
          order('1', 'AGENDADO', { scheduledFor: TODAY_14H }),
          order('2', 'EM_ANDAMENTO', { scheduledFor: new Date('2026-11-18T09:00:00').toISOString() }),
          order('3', 'AGENDADO'),
          order('4', 'AGUARDANDO_APROVACAO'),
        ]),
      );
      flushHome();
      expect(text(el.querySelector('h1'))).toBe('Olá, Bruno');
      expect(text(el.querySelector('.provider-home__lead'))).toBe(
        'Hoje você tem 2 atendimentos e 1 solicitação.',
      );
    });

    it('leva a Recebimentos e Meus serviços, sem "Atualizar painel"', async () => {
      await setup();
      flushHome();
      const links = [...el.querySelectorAll<HTMLAnchorElement>('.provider-home__hero-actions a')];
      expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
        ['Recebimentos', '/provider/recebimentos'],
        ['Meus serviços', '/provider/services'],
      ]);
      expect(el.textContent).not.toContain('Atualizar painel');
    });

    it('sem nome, diz só "Olá"; sem agenda carregada, não resume', async () => {
      await setup(throwError(() => new Error('down')), { user: { id: '17' } });
      flushHome();
      expect(text(el.querySelector('h1'))).toBe('Olá');
      expect(el.querySelector('.provider-home__lead')).toBeNull();
    });
  });

  describe('agenda', () => {
    it('consulta os pedidos de quem está logado', async () => {
      await setup();
      flushHome();
      expect(orderService.getOrderByProvider).toHaveBeenCalledOnceWith('17');
    });

    it('enquanto carrega, a região fica ocupada e sem conteúdo', async () => {
      const pending = new Subject<OrdersResponse>();
      await setup(pending);
      flushHome();
      const body = el.querySelector('section[aria-labelledby="agenda-title"] .tg-loading__body')!;
      expect(body.getAttribute('aria-busy')).toBe('true');
      expect(el.querySelector('tg-appointment-card')).toBeNull();

      pending.next([order('1', 'AGENDADO')]);
      pending.complete();
      fixture.detectChanges();
      expect(body.getAttribute('aria-busy')).not.toBe('true');
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('destaca o próximo atendimento e lista solicitações e o resto da agenda', async () => {
      await setup(
        of([
          order('1', 'AGUARDANDO_PAGAMENTO', { scheduledFor: TODAY_14H }),
          order('2', 'AGENDADO'),
          order('3', 'AGUARDANDO_APROVACAO'),
          order('4', 'CONCLUIDO'),
        ]),
      );
      flushHome();
      const card = el.querySelector('tg-appointment-card')!;
      // AGENDADO pede ação do prestador; o que aguarda pagamento, não.
      expect(text(card)).toContain('Serviço 2');
      expect(text(card)).toContain('Estou a caminho');
      expect(card.querySelector('h4')).not.toBeNull();

      const groups = [...el.querySelectorAll('.provider-home__lists .provider-home__group')];
      expect(groups.map((g) => text(g.querySelector('h3')))).toEqual([
        'Solicitações aguardando você (1)',
        'Também na agenda',
      ]);
      const respond = groups[0].querySelector<HTMLAnchorElement>('a.tg-order-row__action')!;
      expect(text(respond)).toBe('Responder');
      expect(respond.getAttribute('href')).toBe('/provider/3/aprovacao');
      expect(text(groups[1])).toContain('Serviço 1');
      expect(el.textContent).not.toContain('Serviço 4');
    });

    it('sem destaque (só solicitações), as listas ficam sozinhas', async () => {
      await setup(of([order('3', 'AGUARDANDO_APROVACAO')]));
      flushHome();
      expect(el.querySelector('tg-appointment-card')).toBeNull();
      expect(el.querySelectorAll('.provider-home__lists tg-order-row').length).toBe(1);
    });

    it('sem pedidos, mostra o estado vazio', async () => {
      await setup(of([]));
      flushHome();
      const empty = el.querySelector('tg-empty-state')!;
      expect(text(empty)).toContain('Sua agenda está livre');
      expect(empty.querySelector('a')!.getAttribute('href')).toBe('/provider/services');
    });

    it('com erro, mostra o alerta e "Tentar de novo" consulta outra vez', async () => {
      await setup(throwError(() => new Error('down')));
      flushHome();
      const alert = el.querySelector('section[aria-labelledby="agenda-title"] tg-alert')!;
      expect(alert.getAttribute('role')).toBe('alert');
      expect(text(alert)).toContain('Não foi possível carregar sua agenda');

      orderService.getOrderByProvider.and.returnValue(of([order('1', 'AGENDADO')]));
      alert.querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();
      expect(orderService.getOrderByProvider).toHaveBeenCalledTimes(2);
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('sessão sem id: não consulta e mostra o erro', async () => {
      await setup(of([]), {});
      flushHome();
      expect(orderService.getOrderByProvider).not.toHaveBeenCalled();
      expect(text(el.querySelector('section[aria-labelledby="agenda-title"] tg-alert'))).toContain(
        'Não foi possível carregar sua agenda',
      );
    });

    it('uma resposta antiga não sobrescreve a mais recente', async () => {
      const first = new Subject<OrdersResponse>();
      const second = new Subject<OrdersResponse>();
      await setup(first);
      flushHome();
      orderService.getOrderByProvider.and.returnValue(second);
      component.loadOrders();
      second.next([order('2', 'AGENDADO')]);
      first.next([order('1', 'AGENDADO')]);
      fixture.detectChanges();
      expect(component.orders().map((o) => o.id)).toEqual(['2']);
    });
  });

  describe('trocar o status', () => {
    it('chama a API e recarrega a agenda em silêncio; o botão só solta com os dados novos', async () => {
      const reload = new Subject<OrdersResponse>();
      await setup(of([order('1', 'AGENDADO')]));
      flushHome();
      orderService.getOrderByProvider.and.returnValue(reload);

      el.querySelector<HTMLButtonElement>('tg-appointment-card button')!.click();
      fixture.detectChanges();
      expect(orderService.updateOrderStatus).toHaveBeenCalledOnceWith('1', 'EM_DESLOCAMENTO');
      expect(component.updating().has('1')).toBeTrue();
      // Sem skeleton: a agenda continua à vista.
      expect(component.ordersLoading()).toBeFalse();
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();

      // Outro clique enquanto a troca não terminou é ignorado.
      component.advance('1', 'EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1);

      reload.next([order('1', 'EM_DESLOCAMENTO')]);
      fixture.detectChanges();
      expect(component.updating().has('1')).toBeFalse();
      expect(text(el.querySelector('tg-appointment-card'))).toContain('Iniciar serviço');
    });

    it('com erro, solta o botão e mostra a mensagem da API', async () => {
      await setup(of([order('1', 'AGENDADO')]));
      flushHome();
      orderService.updateOrderStatus.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Pedido já atualizado' } })),
      );
      component.advance('1', 'EM_DESLOCAMENTO');
      fixture.detectChanges();
      expect(component.updating().has('1')).toBeFalse();
      expect(text(el.querySelector('tg-alert[tone="danger"]'))).toContain('Pedido já atualizado');
      expect(orderService.getOrderByProvider).toHaveBeenCalledTimes(1);
    });

    it('sem mensagem da API, usa a mensagem padrão', async () => {
      await setup(of([order('1', 'AGENDADO')]));
      flushHome();
      orderService.updateOrderStatus.and.returnValue(throwError(() => new Error('rede')));
      component.advance('1', 'EM_DESLOCAMENTO');
      expect(component.actionError()).toBe('Não foi possível atualizar o atendimento. Tente de novo.');
    });

    it('a linha também troca o status', async () => {
      await setup(of([order('1', 'EM_ANDAMENTO', { scheduledFor: TODAY_14H }), order('2', 'EM_DESLOCAMENTO')]));
      flushHome();
      el.querySelector<HTMLButtonElement>('.provider-home__lists button.tg-order-row__action')!.click();
      expect(orderService.updateOrderStatus).toHaveBeenCalledOnceWith('2', 'EM_ANDAMENTO');
    });
  });

  describe('ganhos', () => {
    it('mostra os 4 indicadores, a nota sobre o repasse e o gráfico', async () => {
      await setup();
      flushHome();
      const kpis = [...el.querySelectorAll('.provider-home__kpi')].map(text);
      expect(kpis[0]).toContain('Ganhos hoje');
      expect(kpis[0]).toContain('R$ 180');
      expect(kpis[1]).toContain('+12% em relação a outubro');
      expect(kpis[2]).toContain('48');
      expect(kpis[2]).toContain('3 nesta semana');
      expect(kpis[3]).toContain('4,9');
      expect(kpis[3]).toContain('Com base em 37 avaliações');
      expect(el.querySelector('.provider-home__kpi .provider-home__positive')).not.toBeNull();
      expect(text(el.querySelector('.provider-home__note'))).toContain('não confirmam o repasse');
      expect(el.querySelector('app-provider-revenue-chart')).not.toBeNull();
    });

    it('últimos serviços com o que o prestador recebeu e a nota', async () => {
      await setup();
      flushHome();
      const rows = [...el.querySelectorAll('.provider-home__recent')];
      expect(rows.length).toBe(2);
      expect(text(rows[0])).toContain('Conserto de tomada');
      expect(text(rows[0])).toContain('Carlos Lima');
      expect(text(rows[0])).toContain('02 nov');
      expect(text(rows[0])).toContain('Você recebeu R$ 72');
      expect(rows[0].querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('Nota 5');
      expect(rows[0].querySelector('a')!.getAttribute('href')).toBe('/orders/90');
      expect(text(rows[1])).toContain('sem avaliação');
    });

    it('insights do negócio', async () => {
      await setup();
      flushHome();
      const items = [...el.querySelectorAll('.provider-home__insight')].map((item) => [
        text(item.querySelector('dt')),
        text(item.querySelector('dd')),
      ]);
      expect(items).toEqual([
        ['Serviço mais pedido', 'Limpeza residencial'],
        ['Ticket médio', 'R$ 165'],
        ['Bairro mais atendido', 'Pinheiros'],
        ['Crescimento no mês', '+12%'],
      ]);
    });

    it('com erro, mostra o alerta e "Tentar de novo" carrega outra vez; a agenda continua', async () => {
      await setup(of([order('1', 'AGENDADO')]));
      http.expectOne(endpoint).flush({}, { status: 503, statusText: 'Unavailable' });
      fixture.detectChanges();
      const alert = el.querySelector('section[aria-labelledby="earnings-title"] tg-alert')!;
      expect(text(alert)).toContain('Não foi possível carregar seus ganhos');
      expect(el.querySelector('.provider-home__kpi')).toBeNull();
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();

      alert.querySelector<HTMLButtonElement>('button')!.click();
      flushHome();
      expect(el.querySelectorAll('.provider-home__kpi').length).toBe(4);
    });
  });
});
