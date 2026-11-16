import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, type ParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, Subject, throwError } from 'rxjs';

import { Order } from '@shared/service/order/order';
import { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { OrderDetailsPage } from './order-details.page';

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '5',
    status: 'AGENDADO',
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
    provider: { id: '17', name: 'João Pereira', photoUrl: null, ratingAvg: 4.8, ratingCount: 3, verified: true },
    client: { id: '7', name: 'Maria Souza', photoUrl: null },
    schedule: { requestedAt: '2026-10-01T10:00:00.000Z', scheduledFor: '2026-10-03T17:00:00.000Z' },
    address: null,
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 150, finalAmount: null },
    providerEarnings: { grossAmount: 150, feePct: 0.1, feeAmount: 15, netAmount: 135 },
    distanceKm: 2.5,
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

const cancelledOrder = details({
  status: 'CANCELADO',
  cancellation: {
    reason: 'NO_AVAILABILITY',
    label: 'Sem horário disponível',
    note: 'Agenda cheia nesta semana',
    canceledAt: '2026-10-01T11:00:00.000Z',
  },
});

describe('OrderDetailsPage', () => {
  let fixture: ComponentFixture<OrderDetailsPage>;
  let component: OrderDetailsPage;
  let el: HTMLElement;
  let orderService: jasmine.SpyObj<Order>;
  let params: BehaviorSubject<ParamMap>;

  async function setup(first: Observable<OrderDetails>, type: string | undefined = 'CUSTOMER') {
    orderService = jasmine.createSpyObj<Order>('Order', ['getOrderDetails', 'updateOrderStatus']);
    orderService.getOrderDetails.and.returnValue(first);
    params = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '5' }));
    await TestBed.configureTestingModule({
      imports: [OrderDetailsPage],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: orderService },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { type } }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(OrderDetailsPage);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  }

  const text = (node: Element | null = el) => (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const rows = () =>
    [...el.querySelectorAll('dl > div')].map((row) => `${text(row.querySelector('dt'))}: ${text(row.querySelector('dd'))}`);
  const buttonByText = (label: string) =>
    [...el.querySelectorAll<HTMLElement>('button, a')].find((b) => text(b) === label) ?? null;

  it('mostra ao cliente por que o prestador recusou', async () => {
    await setup(of(cancelledOrder));
    expect(text()).toContain('O prestador não pôde atender este pedido');
    expect(text()).toContain('Motivo: Sem horário disponível');
    expect(text()).toContain('Agenda cheia nesta semana');
    expect(text()).toContain('Cancelado');
  });

  it('cliente: título, status do DS, o prestador e o pagamento; sem a parte do prestador', async () => {
    await setup(of(details()));
    expect(text(el.querySelector('h1'))).toBe('Instalação de chuveiro');
    expect(text(el.querySelector('tg-badge'))).toBe('Agendado');
    expect(text()).toContain('Prestador');
    expect(text()).toContain('João Pereira');
    expect(text()).toContain('4,8 (3 avaliações)');
    expect(text()).not.toContain('Maria Souza');
    expect(rows()).toContain('Situação: Pago');
    expect(text()).not.toContain('Sua parte');
    expect(el.querySelector('a.order-details__back')?.getAttribute('href')).toBe('/customer');
  });

  it('prestador (PRESTADOR ou PROVIDER): vê o cliente, a sua parte e a taxa; volta para /provider', async () => {
    await setup(of(details()), 'PRESTADOR');
    expect(text()).toContain('Cliente');
    expect(text()).toContain('Maria Souza');
    expect(text()).not.toContain('João Pereira');
    expect(text()).toContain('Sua parte (estimada)');
    expect(rows().map((r) => r.replace(/\s/g, ' '))).toContain('Taxa da plataforma: 10% · R$ 15,00');
    expect(el.querySelector('a.order-details__back')?.getAttribute('href')).toBe('/provider');
    expect(buttonByText('Estou a caminho')).not.toBeNull();
  });

  it('cliente aguardando confirmação: Confirmar conclusão e Reportar problema', async () => {
    await setup(of(details({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' })));
    expect(buttonByText('Confirmar conclusão')?.getAttribute('href')).toBe('/orders/5/confirm');
    expect(buttonByText('Reportar problema')?.getAttribute('href')).toBe('/orders/5/report-problem');
  });

  it('pedido inexistente (404): aviso sem "Tentar de novo"', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect(text()).toContain('Este pedido não foi encontrado');
    expect(buttonByText('Tentar de novo')).toBeNull();
  });

  it('falha ao carregar: aviso com "Tentar de novo" que recarrega', async () => {
    await setup(throwError(() => new HttpErrorResponse({ status: 500 })));
    expect(text()).toContain('Não foi possível carregar o pedido');
    orderService.getOrderDetails.and.returnValue(of(details()));
    buttonByText('Tentar de novo')!.click();
    fixture.detectChanges();
    expect(text(el.querySelector('h1'))).toBe('Instalação de chuveiro');
    expect(orderService.getOrderDetails).toHaveBeenCalledTimes(2);
  });

  describe('troca de status do prestador', () => {
    let update: Subject<OrderDetails>;
    let reloads: Subject<OrderDetails>[];

    async function start(status = 'AGENDADO') {
      await setup(of(details({ status })), 'PROVIDER');
      update = new Subject<OrderDetails>();
      reloads = [];
      orderService.updateOrderStatus.and.returnValue(update);
      orderService.getOrderDetails.and.callFake(() => {
        const next = new Subject<OrderDetails>();
        reloads.push(next);
        return next;
      });
    }
    const succeed = () => {
      update.next(details());
      update.complete();
    };
    const syncAlert = () => el.querySelector('.order-details__sync');

    it('fluxo normal: botão em carregando até a recarga trazer o status novo', async () => {
      await start();
      buttonByText('Estou a caminho')!.click();
      expect(orderService.updateOrderStatus).toHaveBeenCalledOnceWith('5', 'EM_DESLOCAMENTO');
      expect(component.updating()).toBeTrue();
      succeed();
      expect(component.updating()).toBeTrue();
      reloads[0].next(details({ status: 'EM_DESLOCAMENTO' }));
      fixture.detectChanges();
      expect(component.updating()).toBeFalse();
      expect(syncAlert()).toBeNull();
      expect(buttonByText('Iniciar serviço')).not.toBeNull();
      expect(reloads.length).toBe(1);
    });

    it('cliques repetidos não repetem a troca', async () => {
      await start();
      component.advance('EM_DESLOCAMENTO');
      component.advance('EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1);
    });

    it('recarga com o status antigo: continua bloqueado, aviso com "Tentar de novo" até confirmar', async () => {
      await start();
      component.advance('EM_DESLOCAMENTO');
      succeed();
      reloads[0].next(details({ status: 'AGENDADO' }));
      fixture.detectChanges();
      expect(component.updating()).toBeTrue();
      expect(text(syncAlert())).toContain('O pedido pode estar desatualizado');
      component.advance('EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1);

      syncAlert()!.querySelector('button')!.click();
      reloads[1].next(details({ status: 'EM_DESLOCAMENTO' }));
      fixture.detectChanges();
      expect(component.updating()).toBeFalse();
      expect(syncAlert()).toBeNull();
    });

    it('falha na recarga: o pedido fica à vista e bloqueado, com aviso e nova tentativa', async () => {
      await start();
      component.advance('EM_DESLOCAMENTO');
      succeed();
      reloads[0].error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();
      expect(text(el.querySelector('h1'))).toBe('Instalação de chuveiro');
      expect(component.updating()).toBeTrue();
      expect(text(syncAlert())).toContain('não conseguimos carregar o pedido de novo');

      syncAlert()!.querySelector('button')!.click();
      reloads[1].next(details({ status: 'EM_DESLOCAMENTO' }));
      fixture.detectChanges();
      expect(component.updating()).toBeFalse();
      expect(syncAlert()).toBeNull();
    });

    it('erro da API: solta o botão e mostra a mensagem dela', async () => {
      await start();
      component.advance('EM_DESLOCAMENTO');
      update.error(new HttpErrorResponse({ status: 409, error: { message: 'O pedido mudou de status.' } }));
      fixture.detectChanges();
      expect(component.updating()).toBeFalse();
      expect(text()).toContain('O pedido mudou de status.');
      expect(reloads.length).toBe(0);
    });
  });

  describe('navegação entre pedidos', () => {
    let update: Subject<OrderDetails>;
    let loads: { id: string; response: Subject<OrderDetails> }[];
    const orderB = (extra: Partial<OrderDetails> = {}) =>
      details({ id: '6', service: { id: '4', title: 'Pintura de quarto', category: 'Pintura', estimatedPrice: 300 }, ...extra });

    /** Abre A (pedido 5, agendado) como prestador; as próximas cargas e a troca ficam sob controle do teste. */
    async function startOnA() {
      await setup(of(details()), 'PROVIDER');
      update = new Subject<OrderDetails>();
      loads = [];
      orderService.updateOrderStatus.and.returnValue(update);
      orderService.getOrderDetails.and.callFake((id: string) => {
        const response = new Subject<OrderDetails>();
        loads.push({ id, response });
        return response;
      });
    }
    const navigate = (id: string) => {
      params.next(convertToParamMap({ id }));
      fixture.detectChanges();
    };
    const succeedA = () => {
      update.next(details());
      update.complete();
    };
    const showB = (load: { id: string; response: Subject<OrderDetails> }, extra: Partial<OrderDetails> = {}) => {
      expect(load.id).toBe('6');
      load.response.next(orderB(extra));
      fixture.detectChanges();
    };
    const title = () => text(el.querySelector('h1'));
    const syncAlert = () => el.querySelector('.order-details__sync');

    it('1. A troca de A termina depois de ir para B: B não fica bloqueado nem recarrega', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      navigate('6');
      showB(loads[0]);
      succeedA();
      fixture.detectChanges();
      expect(title()).toBe('Pintura de quarto');
      expect(component.updating()).toBeFalse();
      expect(loads.length).toBe(1);
      expect(syncAlert()).toBeNull();
      // B continua utilizável: a troca de B vai para B.
      buttonByText('Estou a caminho')!.click();
      expect(orderService.updateOrderStatus.calls.mostRecent().args).toEqual(['6', 'EM_DESLOCAMENTO']);
    });

    it('2. erro da troca de A depois de ir para B não aparece em B', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      navigate('6');
      showB(loads[0]);
      update.error(new HttpErrorResponse({ status: 409, error: { message: 'O pedido mudou de status.' } }));
      fixture.detectChanges();
      expect(component.actionError()).toBe('');
      expect(text()).not.toContain('O pedido mudou de status.');
      expect(component.updating()).toBeFalse();
      expect(buttonByText('Estou a caminho')).not.toBeNull();
    });

    it('3. respostas fora de ordem: a de A não mexe em B, e a confirmação de B exige o pedido B', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      succeedA();
      expect(loads[0].id).toBe('5');
      navigate('6');
      showB(loads[1]);
      // A recarga de A chega atrasada, já com o status novo.
      loads[0].response.next(details({ status: 'EM_DESLOCAMENTO' }));
      fixture.detectChanges();
      expect(title()).toBe('Pintura de quarto');
      expect(component.updating()).toBeFalse();
      expect(component.syncStale()).toBeFalse();

      // A troca de B só é confirmada por B: uma resposta com outro pedido não solta o botão.
      update = new Subject<OrderDetails>();
      orderService.updateOrderStatus.and.returnValue(update);
      component.advance('EM_DESLOCAMENTO');
      update.next(orderB());
      update.complete();
      expect(loads[2].id).toBe('6');
      loads[2].response.next(details({ status: 'EM_DESLOCAMENTO' }));
      expect(component.updating()).toBeTrue();
      component.sync();
      loads[3].response.next(orderB({ status: 'EM_DESLOCAMENTO' }));
      fixture.detectChanges();
      expect(component.updating()).toBeFalse();
    });

    it('4. falha de sincronização em A não segue para B', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      succeedA();
      loads[0].response.error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();
      expect(component.syncError()).toBeTrue();
      navigate('6');
      expect(component.syncError()).toBeFalse();
      expect(component.updating()).toBeFalse();
      showB(loads[1]);
      expect(title()).toBe('Pintura de quarto');
      expect(syncAlert()).toBeNull();
    });

    it('8. recarga de A pendente ao ir para B: a resposta tardia de A não chega a B', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      succeedA();
      navigate('6');
      expect(loads[0].response.observed).toBeFalse();
      showB(loads[1], { status: 'EM_DESLOCAMENTO' });
      loads[0].response.next(details({ status: 'EM_DESLOCAMENTO' }));
      loads[0].response.error(new HttpErrorResponse({ status: 500 }));
      fixture.detectChanges();
      expect(title()).toBe('Pintura de quarto');
      expect(component.updating()).toBeFalse();
      expect(component.syncError()).toBeFalse();
      expect(syncAlert()).toBeNull();
      expect(buttonByText('Iniciar serviço')).not.toBeNull();
    });

    it('o mesmo id de novo não reinicia a tela nem recarrega', async () => {
      await startOnA();
      component.advance('EM_DESLOCAMENTO');
      navigate('5');
      expect(loads.length).toBe(0);
      expect(component.updating()).toBeTrue();
      expect(title()).toBe('Instalação de chuveiro');
    });
  });
});
