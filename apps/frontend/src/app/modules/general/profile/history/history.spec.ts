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

  describe('sessão (carga reativa)', () => {
    /** Monta a tela com a sessão dada, sem esperar a lista. */
    async function mount(user: unknown) {
      session.set(user);
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
      el = fixture.nativeElement;
      fixture.detectChanges();
    }
    const flush = () => {
      TestBed.tick();
      fixture.detectChanges();
    };
    const ids = () => component.orders().map((o) => o.id);

    it('carga inicial do cliente: uma consulta só', async () => {
      orderService.getOrderByClient.and.returnValue(of([order('c1', 'AGENDADO')]));
      await mount({ user: { id: 'user-1', type: 'CLIENTE' } });
      flush();
      expect(orderService.getOrderByClient).toHaveBeenCalledOnceWith('user-1');
      expect(orderService.getOrderByProvider).not.toHaveBeenCalled();
      expect(ids()).toEqual(['c1']);
    });

    it('carga inicial do prestador: uma consulta só', async () => {
      orderService.getOrderByProvider.and.returnValue(of([order('p1', 'AGENDADO')]));
      await mount({ user: { id: 'user-1', type: 'PRESTADOR' } });
      flush();
      expect(orderService.getOrderByProvider).toHaveBeenCalledOnceWith('user-1');
      expect(orderService.getOrderByClient).not.toHaveBeenCalled();
      expect(ids()).toEqual(['p1']);
    });

    it('troca de cliente para prestador: limpa a lista e busca a do prestador', async () => {
      const providerOrders = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValue(of([order('c1', 'AGENDADO')]));
      orderService.getOrderByProvider.and.returnValue(providerOrders);
      await mount({ user: { id: 'user-1', type: 'CLIENTE' } });
      flush();
      expect(ids()).toEqual(['c1']);

      session.set({ user: { id: 'user-1', type: 'PRESTADOR' } });
      flush();
      expect(orderService.getOrderByProvider).toHaveBeenCalledOnceWith('user-1');
      expect(ids()).toEqual([]);
      expect(component.loading()).toBeTrue();
      expect(el.querySelector('tg-order-row')).toBeNull();

      providerOrders.next([order('p1', 'AGUARDANDO_APROVACAO')]);
      flush();
      expect(ids()).toEqual(['p1']);
      expect(component.perspective()).toBe('provider');
    });

    it('troca entre dois usuários: nada do primeiro fica à vista', async () => {
      const second = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValues(of([order('a1', 'AGENDADO')]), second);
      await mount({ user: { id: 'user-a', type: 'CLIENTE' } });
      flush();
      expect(ids()).toEqual(['a1']);

      session.set({ user: { id: 'user-b', type: 'CLIENTE' } });
      flush();
      expect(orderService.getOrderByClient.calls.mostRecent().args).toEqual(['user-b']);
      expect(ids()).toEqual([]);
      expect(el.textContent).not.toContain('Serviço a1');

      second.next([order('b1', 'AGENDADO')]);
      flush();
      expect(ids()).toEqual(['b1']);
    });

    it('resposta tardia da sessão anterior é ignorada', async () => {
      const first = new Subject<OrdersResponse>();
      const second = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValues(first, second);
      await mount({ user: { id: 'user-a', type: 'CLIENTE' } });
      flush();

      session.set({ user: { id: 'user-b', type: 'CLIENTE' } });
      flush();
      expect(first.observed).toBeFalse();
      second.next([order('b1', 'AGENDADO')]);
      first.next([order('a1', 'AGENDADO')]);
      flush();
      expect(ids()).toEqual(['b1']);
    });

    it('logout durante a consulta: cancela, limpa e mostra o erro sem consultar de novo', async () => {
      const pending = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValue(pending);
      await mount({ user: { id: 'user-1', type: 'CLIENTE' } });
      flush();
      expect(pending.observed).toBeTrue();

      session.set(null);
      flush();
      expect(pending.observed).toBeFalse();
      expect(ids()).toEqual([]);
      expect(component.error()).toBeTrue();
      expect(orderService.getOrderByClient).toHaveBeenCalledTimes(1);
    });

    it('sessão sem id válido: não consulta a API e mostra o erro', async () => {
      await mount({ user: { id: '   ', type: 'CLIENTE' } });
      flush();
      expect(orderService.getOrderByClient).not.toHaveBeenCalled();
      expect(orderService.getOrderByProvider).not.toHaveBeenCalled();
      expect(el.querySelector('tg-alert')?.textContent).toContain('Não foi possível carregar');
    });

    it('a sessão regravada com os mesmos dados não consulta de novo', async () => {
      orderService.getOrderByClient.and.returnValue(of([order('c1', 'AGENDADO')]));
      await mount({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana' } });
      flush();
      session.set({ user: { id: 'user-1', type: 'CLIENTE', name: 'Ana Souza' } });
      flush();
      expect(orderService.getOrderByClient).toHaveBeenCalledTimes(1);
    });

    it('uma lista antiga não sobrescreve a recarga mais nova', async () => {
      const first = new Subject<OrdersResponse>();
      const second = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValues(first, second);
      await mount({ user: { id: 'user-1', type: 'CLIENTE' } });
      flush();
      component.load();
      second.next([order('novo', 'AGENDADO')]);
      first.next([order('velho', 'AGENDADO')]);
      expect(ids()).toEqual(['novo']);
    });
  });

  describe('próximo passo do prestador (concorrência)', () => {
    let updates: Record<string, Subject<unknown>>;
    let reloads: Subject<OrdersResponse>[];

    /** Prestador com A e B agendados; cada troca e cada recarga respondem quando o teste manda. */
    async function provider() {
      updates = { A: new Subject<unknown>(), B: new Subject<unknown>() };
      reloads = [];
      orderService.updateOrderStatus.and.callFake((id: string) => updates[id]);
      await setup(of([order('A', 'AGENDADO'), order('B', 'AGENDADO')]), 'PRESTADOR', '/general/user-1/history?aba=agendados');
      orderService.getOrderByProvider.and.callFake(() => {
        const reload = new Subject<OrdersResponse>();
        reloads.push(reload);
        return reload;
      });
    }
    const busy = () => [...component.updating()].sort();
    const ok = (id: string) => {
      updates[id].next({});
      updates[id].complete();
    };

    it('dois pedidos ao mesmo tempo: os dois ficam em carregando', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus.calls.allArgs()).toEqual([
        ['A', 'EM_DESLOCAMENTO'],
        ['B', 'EM_DESLOCAMENTO'],
      ]);
      expect(busy()).toEqual(['A', 'B']);
      fixture.detectChanges();
      expect(el.querySelectorAll('tg-tab:not([hidden]) tg-order-row [aria-busy="true"]').length).toBe(2);
    });

    it('A termina antes de B: a lista de A não solta B', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      ok('A');
      reloads[0].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'AGENDADO')]);
      expect(busy()).toEqual(['B']);

      ok('B');
      expect(busy()).toEqual(['B']);
      reloads[1].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'EM_DESLOCAMENTO')]);
      expect(busy()).toEqual([]);
      expect(component.orders().map((o) => o.status)).toEqual(['EM_DESLOCAMENTO', 'EM_DESLOCAMENTO']);
    });

    it('B termina antes de A: a lista de B não solta A', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      ok('B');
      reloads[0].next([order('A', 'AGENDADO'), order('B', 'EM_DESLOCAMENTO')]);
      expect(busy()).toEqual(['A']);
      ok('A');
      reloads[1].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'EM_DESLOCAMENTO')]);
      expect(busy()).toEqual([]);
    });

    it('as duas confirmam antes das listas: a lista mais nova solta as duas e a antiga é descartada', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      ok('A');
      ok('B');
      expect(reloads[0].observed).toBeFalse();
      reloads[1].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'EM_DESLOCAMENTO')]);
      reloads[0].next([order('A', 'AGENDADO'), order('B', 'AGENDADO')]);
      expect(busy()).toEqual([]);
      expect(component.orders().map((o) => o.status)).toEqual(['EM_DESLOCAMENTO', 'EM_DESLOCAMENTO']);
    });

    it('falha de A com B em curso: solta só A e mostra o motivo', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      updates['A'].error(new HttpErrorResponse({ status: 409, error: { message: 'Pedido já mudou de status' } }));
      fixture.detectChanges();
      expect(busy()).toEqual(['B']);
      expect(el.querySelector('tg-alert')?.textContent).toContain('Pedido já mudou de status');
      expect(reloads.length).toBe(0);
    });

    describe('reconciliação com a lista', () => {
      const stale = () => [order('A', 'AGENDADO'), order('B', 'AGENDADO')];
      const fresh = () => [order('A', 'EM_DESLOCAMENTO'), order('B', 'AGENDADO')];
      /** Avança o relógio até a próxima consulta agendada. */
      const wait = (ms: number) => jasmine.clock().tick(ms);

      beforeEach(() => jasmine.clock().install());
      afterEach(() => jasmine.clock().uninstall());

      it('lista mais nova com o status antigo não solta o pedido e consulta de novo', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(stale());
        expect(busy()).toEqual(['A']);
        expect(component.reconcileFailed()).toBeFalse();

        wait(999);
        expect(reloads.length).toBe(1);
        wait(1);
        expect(reloads.length).toBe(2);
        reloads[1].next(fresh());
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeFalse();
        expect(component.actionError()).toBe('');
      });

      it('a lista com um status posterior ao pedido também solta o pedido', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next([order('A', 'EM_ANDAMENTO'), order('B', 'AGENDADO')]);
        expect(busy()).toEqual([]);
      });

      it('a lista com o status antigo de outro pedido não solta este nem gasta tentativa dele', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        component.advance('B', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(fresh());
        expect(busy()).toEqual(['B']);
        ok('B');
        reloads[1].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'EM_DESLOCAMENTO')]);
        expect(busy()).toEqual([]);
        wait(5000);
        expect(reloads.length).toBe(2);
      });

      it('lista sem o pedido não solta o pedido e consulta de novo', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next([order('B', 'AGENDADO')]);
        expect(busy()).toEqual(['A']);
        expect(component.reconcileFailed()).toBeFalse();

        wait(1000);
        expect(reloads.length).toBe(2);
        reloads[1].next(fresh());
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeFalse();
      });

      it('lista sem o pedido em todas as tentativas: solta o pedido e avisa', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next([order('B', 'AGENDADO')]);
        wait(1000);
        reloads[1].next([order('B', 'AGENDADO')]);
        expect(busy()).toEqual(['A']);
        wait(2000);
        reloads[2].next([order('B', 'AGENDADO')]);

        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeTrue();
        wait(10000);
        expect(reloads.length).toBe(3);
      });

      it('lista com o pedido cancelado por outra pessoa solta o pedido (não há status antigo à vista)', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next([order('A', 'CANCELADO'), order('B', 'AGENDADO')]);
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeFalse();
        wait(5000);
        expect(reloads.length).toBe(1);
      });

      it('esgotadas as tentativas: solta o pedido e avisa, com "Recarregar lista"', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(stale());
        wait(1000);
        reloads[1].next(stale());
        expect(busy()).toEqual(['A']);
        wait(2000);
        reloads[2].next(stale());

        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeTrue();
        wait(10000);
        expect(reloads.length).toBe(3);

        fixture.detectChanges();
        const alert = Array.from(el.querySelectorAll('tg-alert')).find((a) => a.textContent?.includes('status novo'));
        expect(alert?.textContent).toContain('A lista ainda não mostra o status novo');
        const reload = Array.from(alert?.querySelectorAll('button') ?? []).find((b) => b.textContent?.includes('Recarregar lista'));
        reload?.click();
        expect(reloads.length).toBe(4);
        expect(component.reconcileFailed()).toBeFalse();
        reloads[3].next(fresh());
        expect(component.orders()[0].status).toBe('EM_DESLOCAMENTO');
      });

      it('a recarga que falha gasta uma tentativa, mantém a lista e consulta de novo', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].error(new Error('offline'));
        expect(component.orders().length).toBe(2);
        expect(component.error()).toBeFalse();
        expect(busy()).toEqual(['A']);

        wait(1000);
        reloads[1].next(fresh());
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeFalse();
      });

      it('recargas que falham em todas as tentativas: solta o pedido e avisa', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].error(new Error('offline'));
        wait(1000);
        reloads[1].error(new Error('offline'));
        wait(2000);
        reloads[2].error(new Error('offline'));
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeTrue();
        expect(component.orders().length).toBe(2);
      });

      it('outra lista pedida antes da consulta agendada substitui a agendada', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        component.advance('B', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(stale());
        ok('B');
        expect(reloads.length).toBe(2);
        reloads[1].next([order('A', 'EM_DESLOCAMENTO'), order('B', 'EM_DESLOCAMENTO')]);
        expect(busy()).toEqual([]);
        wait(5000);
        expect(reloads.length).toBe(2);
      });

      it('trocar de sessão cancela a consulta agendada', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(stale());
        orderService.getOrderByProvider.and.returnValue(of([]));
        session.set({ user: { id: 'user-2', type: 'PRESTADOR' } });
        TestBed.tick();
        orderService.getOrderByProvider.calls.reset();
        wait(5000);
        expect(orderService.getOrderByProvider).not.toHaveBeenCalled();
        expect(busy()).toEqual([]);
        expect(component.reconcileFailed()).toBeFalse();
      });

      it('destruir a tela cancela a consulta agendada', async () => {
        await provider();
        component.advance('A', 'EM_DESLOCAMENTO');
        ok('A');
        reloads[0].next(stale());
        fixture.destroy();
        wait(5000);
        expect(reloads.length).toBe(1);
      });
    });

    it('duplo clique no mesmo pedido não repete a chamada', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('A', 'EM_DESLOCAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledOnceWith('A', 'EM_DESLOCAMENTO');
      ok('A');
      component.advance('A', 'EM_ANDAMENTO');
      expect(orderService.updateOrderStatus).toHaveBeenCalledTimes(1);
    });

    it('a resposta síncrona da API também espera a lista nova', async () => {
      orderService.updateOrderStatus.and.returnValue(of({}));
      await setup(of([order('A', 'AGENDADO')]), 'PRESTADOR');
      const reload = new Subject<OrdersResponse>();
      orderService.getOrderByProvider.and.returnValue(reload);
      component.advance('A', 'EM_DESLOCAMENTO');
      expect(component.updating().has('A')).toBeTrue();
      reload.next([order('A', 'EM_DESLOCAMENTO')]);
      expect(component.updating().has('A')).toBeFalse();
    });

    it('destruir a tela com troca e lista em curso cancela as duas', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      component.advance('B', 'EM_DESLOCAMENTO');
      ok('B');
      expect(updates['A'].observed).toBeTrue();
      expect(reloads[0].observed).toBeTrue();
      fixture.destroy();
      expect(updates['A'].observed).toBeFalse();
      expect(reloads[0].observed).toBeFalse();
    });

    it('trocar de sessão com troca em curso cancela a troca e solta os botões', async () => {
      await provider();
      component.advance('A', 'EM_DESLOCAMENTO');
      orderService.getOrderByProvider.and.returnValue(of([]));
      session.set({ user: { id: 'user-2', type: 'PRESTADOR' } });
      TestBed.tick();
      expect(updates['A'].observed).toBeFalse();
      expect(busy()).toEqual([]);
    });
  });
});
