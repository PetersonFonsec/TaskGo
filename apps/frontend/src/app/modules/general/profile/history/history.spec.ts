import { HttpErrorResponse } from '@angular/common/http';
import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of, Subject, throwError } from 'rxjs';

import { Order } from '@shared/service/order/order';
import { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { History } from './history';

function order(id: string, status: string, extra: Partial<OrderModel> = {}): OrderModel {
  return {
    id,
    clientId: 'user-1',
    serviceId: 's-' + id,
    status,
    scheduledFor: '2026-11-20T12:00:00.000Z',
    client: { id: 'c', name: 'Marina Souza', email: '' },
    service: { title: 'Serviço ' + id, provider: { user: { name: 'Ana Souza' } } },
    addressSnap: { neighborhood: 'Pinheiros' },
    ...extra,
  } as OrderModel;
}

describe('History (Pedidos)', () => {
  let fixture: ComponentFixture<History>;
  let component: History;
  let el: HTMLElement;
  let session: WritableSignal<unknown>;
  const orderService = {
    getOrderByClient: jasmine.createSpy('getOrderByClient'),
    getOrderByProvider: jasmine.createSpy('getOrderByProvider'),
    updateOrderStatus: jasmine.createSpy('updateOrderStatus'),
  };

  async function setup(orders: Observable<OrdersResponse>, type = 'CLIENTE', url = '/general/user-1/history') {
    orderService.getOrderByClient.and.returnValue(orders);
    orderService.getOrderByProvider.and.returnValue(orders);
    session.set({ user: { id: 'user-1', type, name: 'Ana' } });
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideRouter([{ path: 'general/:userId/history', component: History }]),
        { provide: Order, useValue: orderService },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const tabs = () => Array.from(el.querySelectorAll<HTMLElement>('[role="tab"]'));
  const selectedTab = () => el.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
  const visibleRows = () =>
    Array.from(el.querySelectorAll<HTMLElement>('tg-tab:not([hidden]) tg-order-row')).map(
      (row) => row.querySelector('.tg-order-row__link')?.textContent?.trim(),
    );
  const topSearch = () => el.querySelector('.orders__header a[tgButton]');

  beforeEach(() => {
    session = signal<unknown>(undefined);
    orderService.getOrderByClient.calls.reset();
    orderService.getOrderByProvider.calls.reset();
    orderService.updateOrderStatus.calls.reset();
  });

  it('cliente: busca os pedidos do cliente e mostra Ativos, Concluídos e Cancelados', async () => {
    await setup(of([order('1', 'AGENDADO'), order('2', 'CONCLUIDO')]));
    expect(orderService.getOrderByClient).toHaveBeenCalledWith('user-1');
    expect(orderService.getOrderByProvider).not.toHaveBeenCalled();
    expect(el.querySelector('h1')?.textContent).toContain('Pedidos');
    expect(tabs().map((t) => t.textContent?.replace(/\s+/g, ''))).toEqual(['Ativos1', 'Concluídos', 'Cancelados']);
    expect(visibleRows()).toEqual(['Serviço 1']);
  });

  it('prestador: busca os pedidos do prestador e mostra Solicitações, Agendados e Histórico', async () => {
    await setup(of([order('1', 'AGUARDANDO_APROVACAO'), order('2', 'AGENDADO')]), 'PRESTADOR');
    expect(orderService.getOrderByProvider).toHaveBeenCalledWith('user-1');
    expect(tabs().map((t) => t.textContent?.replace(/\s+/g, ''))).toEqual(['Solicitações1', 'Agendados', 'Histórico']);
    expect(visibleRows()).toEqual(['Serviço 1']);
  });

  it('abre na aba da URL e grava a aba escolhida na URL', async () => {
    await setup(of([order('1', 'AGENDADO'), order('2', 'CONCLUIDO')]), 'CLIENTE', '/general/user-1/history?aba=concluidos');
    expect(selectedTab()?.textContent).toContain('Concluídos');
    expect(visibleRows()).toEqual(['Serviço 2']);

    tabs()[2].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/general/user-1/history?aba=cancelados');
    expect(selectedTab()?.textContent).toContain('Cancelados');
  });

  it('aba desconhecida na URL: mostra a primeira', async () => {
    await setup(of([order('1', 'AGENDADO')]), 'CLIENTE', '/general/user-1/history?aba=nada');
    expect(selectedTab()?.textContent).toContain('Ativos');
  });

  it('sem pedidos: estado vazio com a busca, e o "Buscar serviço" do topo some', async () => {
    await setup(of([]));
    expect(el.querySelector('tg-tab:not([hidden]) tg-empty-state')?.textContent).toContain('Nenhum pedido em andamento');
    expect(el.querySelector('tg-tab:not([hidden]) tg-empty-state a')?.getAttribute('href')).toBe('/customer/search');
    expect(topSearch()).toBeNull();
  });

  it('com pedidos: o cliente vê "Buscar serviço" no topo; o prestador não', async () => {
    await setup(of([order('1', 'CONCLUIDO')]));
    expect(topSearch()?.textContent).toContain('Buscar serviço');
  });

  it('prestador com pedidos não tem busca no topo', async () => {
    await setup(of([order('1', 'AGENDADO')]), 'PRESTADOR');
    expect(topSearch()).toBeNull();
  });

  it('enquanto carrega, não mostra abas nem busca no topo', async () => {
    await setup(new Subject<OrdersResponse>());
    expect(component.loading()).toBeTrue();
    expect(el.querySelector('tg-loading[aria-busy="true"], tg-loading')).not.toBeNull();
    expect(tabs().length).toBe(0);
    expect(topSearch()).toBeNull();
  });

  it('falha: alerta com "Tentar de novo", que recarrega', async () => {
    await setup(throwError(() => new Error('offline')));
    const alert = el.querySelector('tg-alert');
    expect(alert?.textContent).toContain('Não foi possível carregar seus pedidos');

    orderService.getOrderByClient.and.returnValue(of([order('1', 'AGENDADO')]));
    alert!.querySelector<HTMLButtonElement>('button[tgButton]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('tg-alert')).toBeNull();
    expect(visibleRows()).toEqual(['Serviço 1']);
  });

  it('sessão sem id: não consulta a API e mostra o erro', async () => {
    orderService.getOrderByClient.and.returnValue(of([]));
    session.set({});
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: orderService },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(History);
    fixture.detectChanges();
    expect(orderService.getOrderByClient).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('tg-alert')?.textContent).toContain('Não foi possível carregar');
  });

  it('uma resposta antiga não sobrescreve a recarga mais nova', async () => {
    const first = new Subject<OrdersResponse>();
    const second = new Subject<OrdersResponse>();
    orderService.getOrderByClient.and.returnValues(first, second);
    session.set({ user: { id: 'user-1', type: 'CLIENTE' } });
    await TestBed.configureTestingModule({
      imports: [History],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: orderService },
        { provide: UserLoggedService, useValue: { user: session } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(History);
    component = fixture.componentInstance;
    fixture.detectChanges();
    component.load();
    second.next([order('novo', 'AGENDADO')]);
    first.next([order('velho', 'AGENDADO')]);
    expect(component.orders().map((o) => o.id)).toEqual(['novo']);
  });

  describe('próximo passo do prestador', () => {
    it('troca o status, deixa o botão carregando e só solta com a lista nova', async () => {
      const update = new Subject<unknown>();
      orderService.updateOrderStatus.and.returnValue(update);
      await setup(of([order('1', 'AGENDADO')]), 'PRESTADOR', '/general/user-1/history?aba=agendados');

      component.advance('1', 'EM_DESLOCAMENTO');
      component.advance('1', 'EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledOnceWith('1', 'EM_DESLOCAMENTO');
      expect(component.updating().has('1')).toBeTrue();

      const reload = new Subject<OrdersResponse>();
      orderService.getOrderByProvider.and.returnValue(reload);
      update.next({});
      update.complete();
      expect(component.updating().has('1')).toBeTrue();
      expect(component.loading()).toBeFalse();

      reload.next([order('1', 'EM_DESLOCAMENTO')]);
      expect(component.updating().has('1')).toBeFalse();
      expect(component.orders()[0].status).toBe('EM_DESLOCAMENTO');
    });

    it('erro da API: mostra a mensagem dela e solta o botão', async () => {
      orderService.updateOrderStatus.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Pedido já mudou de status' } })),
      );
      await setup(of([order('1', 'AGENDADO')]), 'PRESTADOR');
      component.advance('1', 'EM_DESLOCAMENTO');
      fixture.detectChanges();
      expect(component.updating().size).toBe(0);
      expect(el.querySelector('tg-alert')?.textContent).toContain('Pedido já mudou de status');
    });

    it('a troca deu certo mas a recarga falhou: mantém a lista e avisa', async () => {
      orderService.updateOrderStatus.and.returnValue(of({}));
      await setup(of([order('1', 'AGENDADO')]), 'PRESTADOR');
      orderService.getOrderByProvider.and.returnValue(throwError(() => new Error('offline')));
      component.advance('1', 'EM_DESLOCAMENTO');
      fixture.detectChanges();
      expect(component.orders().length).toBe(1);
      expect(component.error()).toBeFalse();
      expect(component.updating().size).toBe(0);
      expect(component.actionError()).toContain('Recarregue a página');
    });
  });
});
