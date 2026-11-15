import { provideRouter } from '@angular/router';
import { Address } from '@shared/service/address/address';
import { Observable, of, Subject, throwError } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { Order } from '@shared/service/order/order';
import { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, type WritableSignal } from '@angular/core';

import { Home } from './home';
import { ICategory } from '@shared/service/category/category.model';

function order(id: string, status: string, extra: Partial<OrderModel> = {}): OrderModel {
  return {
    id,
    clientId: 'user-1',
    serviceId: 's-' + id,
    status,
    scheduledFor: '2026-11-20T12:00:00.000Z',
    service: { title: 'Serviço ' + id, provider: { user: { name: 'Ana Souza' } } },
    addressSnap: { street: 'Rua Harmonia', number: '123', neighborhood: 'Pinheiros' },
    ...extra,
  } as OrderModel;
}

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let el: HTMLElement;

  const addressService = { getAddress: jasmine.createSpy('getAddress') };
  const orderService = { getOrderByClient: jasmine.createSpy('getOrderByClient') };
  const categoryService = { getCategories: jasmine.createSpy('getCategories') };
  let userName: string | undefined;
  // A sessão real vem do localStorage e pode ser `{}`, `null` ou incompleta.
  let session: WritableSignal<unknown>;

  async function setup(
    orders: Observable<OrdersResponse> = of([]),
    user: unknown = { user: { id: 'user-1', name: userName } },
  ) {
    orderService.getOrderByClient.and.returnValue(orders);
    session.set(user);
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: Address, useValue: addressService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Order, useValue: orderService },
        {
          provide: UserLoggedService,
          useValue: { user: session },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  beforeEach(() => {
    userName = 'Ana Clara Souza';
    session = signal<unknown>(undefined);
    addressService.getAddress.calls.reset();
    addressService.getAddress.and.returnValue(of({ data: [] }));
    categoryService.getCategories.and.returnValue(of({ data: [] }));
    orderService.getOrderByClient.calls.reset();
  });

  describe('endereço', () => {
    beforeEach(() => setup());

    it('mostra o alerta com o link de cadastro quando não há endereço', () => {
      const alert = el.querySelector('tg-alert.customer-home__address')!;
      expect(alert.getAttribute('role')).toBe('status');
      expect(alert.textContent).toContain('Cadastre seu endereço');
      const link = alert.querySelector('a[tgButton]')!;
      expect(link.textContent).toContain('Cadastrar endereço');
      expect(link.getAttribute('href')).toBe('/general/user-1/addresses');
    });

    it('esconde o alerta quando já existe endereço', () => {
      addressService.getAddress.and.returnValue(of({ data: [{ id: 'address-1' }] }));
      component.ngOnInit();
      fixture.detectChanges();
      expect(el.querySelector('.customer-home__address')).toBeNull();
    });

    it('não trata uma falha na consulta como endereço ausente', () => {
      addressService.getAddress.and.returnValue(throwError(() => new Error('Unavailable')));
      component.ngOnInit();
      fixture.detectChanges();
      expect(el.querySelector('.customer-home__address')).toBeNull();
    });
  });

  describe('saudação', () => {
    it('usa o primeiro nome de quem está logado e leva a busca', async () => {
      await setup();
      expect(el.querySelector('h1')!.textContent!.trim()).toBe('Olá, Ana');
      const search = el.querySelector<HTMLAnchorElement>('.customer-home__search')!;
      expect(search.textContent).toContain('Buscar serviço');
      expect(search.getAttribute('href')).toBe('/customer/search');
    });

    it('sem nome, diz só "Olá"', async () => {
      userName = undefined;
      await setup();
      expect(el.querySelector('h1')!.textContent!.trim()).toBe('Olá');
    });

    it('não tem ilustração', async () => {
      await setup();
      expect(el.querySelector('.customer-home__hero img')).toBeNull();
    });
  });

  describe('agenda', () => {
    it('enquanto carrega, a região fica ocupada e sem conteúdo', async () => {
      const pending = new Subject<OrdersResponse>();
      await setup(pending);
      const loading = el.querySelector('tg-loading .tg-loading__body')!;
      expect(loading.getAttribute('aria-busy')).toBe('true');
      expect(el.querySelector('tg-appointment-card')).toBeNull();
      expect(el.querySelector('tg-empty-state')).toBeNull();

      pending.next([order('1', 'AGENDADO')]);
      pending.complete();
      fixture.detectChanges();
      expect(loading.getAttribute('aria-busy')).not.toBe('true');
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('sem pedido ativo, mostra o estado vazio com a busca', async () => {
      await setup(of([]));
      const empty = el.querySelector('tg-empty-state')!;
      expect(empty.textContent).toContain('Sua agenda está livre');
      expect(empty.querySelector('h3')).not.toBeNull();
      expect(empty.querySelector('a')!.getAttribute('href')).toBe('/customer/search');
      expect(el.querySelector('tg-appointment-card')).toBeNull();
    });

    it('destaca o pedido que pede ação e lista os demais ativos', async () => {
      await setup(
        of([
          order('1', 'AGENDADO', { scheduledFor: '2026-11-18T12:00:00.000Z' }),
          order('2', 'AGUARDANDO_PAGAMENTO', {
            scheduledFor: '2026-11-25T12:00:00.000Z',
            payment: { status: 'CREATED' } as OrderModel['payment'],
          }),
          order('3', 'EM_DESLOCAMENTO', { scheduledFor: '2026-11-16T12:00:00.000Z' }),
        ]),
      );
      const card = el.querySelector('tg-appointment-card')!;
      expect(card.querySelector('a[tgCardLink]')!.textContent).toContain('Serviço 2');
      expect(card.querySelector('a[tgButton]')!.textContent).toContain('Pagar');
      const rows = Array.from(el.querySelectorAll('.customer-home__more tg-order-row'));
      expect(rows.map((row) => row.querySelector('a')!.textContent!.trim())).toEqual([
        'Serviço 3',
        'Serviço 1',
      ]);
      expect(el.querySelector('.customer-home__more h3')!.textContent).toContain('Também na agenda');
    });

    it('com um único ativo, não mostra a lista', async () => {
      await setup(of([order('1', 'AGENDADO')]));
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
      expect(el.querySelector('.customer-home__more')).toBeNull();
    });

    it('erro ao carregar vira alerta com "Tentar de novo", não agenda vazia', async () => {
      await setup(throwError(() => new Error('offline')));
      const alert = el.querySelector('tg-alert[role="alert"]')!;
      expect(alert.textContent).toContain('Não foi possível carregar seus pedidos');
      expect(el.querySelector('tg-empty-state')).toBeNull();

      orderService.getOrderByClient.and.returnValue(of([order('1', 'AGENDADO')]));
      alert.querySelector<HTMLButtonElement>('button')!.click();
      fixture.detectChanges();
      expect(orderService.getOrderByClient).toHaveBeenCalledTimes(2);
      expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('"Agendar serviço" leva à busca', async () => {
      await setup();
      const link = Array.from(el.querySelectorAll('a')).find((a) => a.textContent!.includes('Agendar serviço'))!;
      expect(link.getAttribute('href')).toBe('/customer/search');
    });
  });

  describe('histórico', () => {
    it('mostra os pedidos encerrados reais, com "Avaliar" quando falta avaliação', async () => {
      await setup(
        of([
          order('1', 'CONCLUIDO', { scheduledFor: '2026-11-02T12:00:00.000Z' }),
          order('2', 'CANCELADO', { scheduledFor: '2026-10-18T12:00:00.000Z' }),
        ]),
      );
      const section = el.querySelector('[aria-labelledby="history-title"]')!;
      const rows = Array.from(section.querySelectorAll('tg-order-row'));
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Serviço 1');
      expect(rows[0].querySelector('a[tgButton]')!.textContent).toContain('Avaliar');
      expect(rows[1].textContent).toContain('Cancelado');
    });

    it('sem pedido encerrado, a seção não aparece', async () => {
      await setup(of([order('1', 'AGENDADO')]));
      expect(el.querySelector('[aria-labelledby="history-title"]')).toBeNull();
    });

    it('não mostra mais os cards falsos', async () => {
      await setup();
      expect(el.textContent).not.toContain('Serviço residencial');
    });
  });

  describe('categorias', () => {
    beforeEach(() => setup());

    it('card do DS com a imagem decorativa, o nome e o link da busca', () => {
      const thumb = 'https://imagedelivery.net/Bpbv9d8J9NqFhm--zUdxEA/limpeza/public';
      component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb } as ICategory]);
      fixture.detectChanges();
      const card = el.querySelector<HTMLAnchorElement>('.customer-home__categories a.tg-card')!;
      expect(card.classList).toContain('tg-card--link');
      expect(card.getAttribute('href')).toBe('/customer/search?categoria=limpeza');
      const image = card.querySelector('img')!;
      expect(image.getAttribute('src')).toBe(thumb);
      expect(image.getAttribute('alt')).toBe('');
      expect(card.querySelector('.customer-home__category-name')!.textContent!.trim()).toBe('Limpeza');
      expect(card.textContent!.trim()).toBe('Limpeza');
    });

    it('sem miniatura, mostra só o nome, sem imagem quebrada', () => {
      component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb: null } as ICategory]);
      fixture.detectChanges();
      expect(el.querySelector('.customer-home__categories img')).toBeNull();
      expect(el.querySelector('.customer-home__categories')!.textContent).toContain('Limpeza');
    });

    it('uma falha nas categorias não impede a agenda', async () => {
      TestBed.resetTestingModule();
      categoryService.getCategories.and.returnValue(throwError(() => new Error('offline')));
      await setup(of([order('1', 'AGENDADO')]));
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });
  });

  it('não usa mais os componentes antigos da tela', async () => {
    categoryService.getCategories.and.returnValue(of({ data: [{ id: 1, name: 'Limpeza', slug: 'limpeza' }] }));
    await setup(of([order('1', 'AGENDADO'), order('2', 'CONCLUIDO')]));
    for (const legacy of ['app-banner', 'app-card-thumb', 'app-card-appointment', 'app-card-service-history', 'app-slider', 'app-button', 'fa-icon']) {
      expect(el.querySelector(legacy)).withContext(legacy).toBeNull();
    }
  });

  describe('concorrência: só a carga mais recente muda a tela', () => {
    let first: Subject<OrdersResponse>;
    let second: Subject<OrdersResponse>;

    async function twoRequests() {
      first = new Subject<OrdersResponse>();
      second = new Subject<OrdersResponse>();
      await setup(first); // A, disparada no ngOnInit
      orderService.getOrderByClient.and.returnValue(second);
      component.loadOrders(); // B
      fixture.detectChanges();
    }
    const titles = () =>
      Array.from(el.querySelectorAll('tg-appointment-card a[tgCardLink], tg-order-row a.tg-order-row__link')).map(
        (a) => a.textContent!.trim(),
      );

    it('A: resposta antiga que chega depois não sobrescreve a nova', async () => {
      await twoRequests();
      second.next([order('novo', 'AGENDADO')]);
      fixture.detectChanges();
      first.next([order('antigo', 'AGENDADO')]);
      fixture.detectChanges();
      expect(titles()).toEqual(['Serviço novo']);
      expect(first.observed).toBeFalse();
    });

    it('B: erro da carga antiga não apaga os dados nem mostra erro', async () => {
      await twoRequests();
      second.next([order('novo', 'AGENDADO')]);
      fixture.detectChanges();
      first.error(new Error('timeout antigo'));
      fixture.detectChanges();
      expect(component.ordersError()).toBeFalse();
      expect(el.querySelector('tg-alert[role="alert"]')).toBeNull();
      expect(titles()).toEqual(['Serviço novo']);
    });

    it('C: o fim da carga antiga não encerra o carregamento da atual', async () => {
      await twoRequests();
      first.next([order('antigo', 'AGENDADO')]);
      first.complete();
      fixture.detectChanges();
      expect(component.ordersLoading()).toBeTrue();
      expect(el.querySelector('.tg-loading__body')!.getAttribute('aria-busy')).toBe('true');

      second.next([order('novo', 'AGENDADO')]);
      fixture.detectChanges();
      expect(component.ordersLoading()).toBeFalse();
      expect(titles()).toEqual(['Serviço novo']);
    });

    it('"Tentar de novo" depois de um erro carrega de novo', async () => {
      const failing = new Subject<OrdersResponse>();
      await setup(failing);
      failing.error(new Error('offline'));
      fixture.detectChanges();
      expect(component.ordersError()).toBeTrue();

      const retry = new Subject<OrdersResponse>();
      orderService.getOrderByClient.and.returnValue(retry);
      el.querySelector<HTMLButtonElement>('tg-alert[role="alert"] button')!.click();
      fixture.detectChanges();
      expect(component.ordersLoading()).toBeTrue();
      expect(component.ordersError()).toBeFalse();
      retry.next([order('1', 'AGENDADO')]);
      fixture.detectChanges();
      expect(component.ordersLoading()).toBeFalse();
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('D: ao destruir, a carga em curso é cancelada e não muda o estado', async () => {
      const pending = new Subject<OrdersResponse>();
      await setup(pending);
      expect(pending.observed).toBeTrue();
      fixture.destroy();
      expect(pending.observed).toBeFalse();
      pending.next([order('tarde', 'AGENDADO')]);
      expect(component.orders()).toEqual([]);
      expect(component.ordersLoading()).toBeTrue();
    });
  });

  describe('disputa', () => {
    it('fica visível na lista, sem tirar o destaque do agendamento válido', async () => {
      await setup(
        of([
          order('disputa', 'DISPUTA', { scheduledFor: '2026-11-16T12:00:00.000Z' }),
          order('valido', 'AGENDADO', { scheduledFor: '2026-11-20T12:00:00.000Z' }),
        ]),
      );
      expect(el.querySelector('tg-appointment-card a[tgCardLink]')!.textContent).toContain('Serviço valido');
      const row = el.querySelector('.customer-home__more tg-order-row')!;
      expect(row.textContent).toContain('Serviço disputa');
      expect(row.textContent).toContain('Em análise');
    });

    it('só em disputa: sem destaque e sem "agenda livre", a lista aparece', async () => {
      await setup(of([order('disputa', 'DISPUTA')]));
      expect(el.querySelector('tg-appointment-card')).toBeNull();
      expect(el.querySelector('tg-empty-state')).toBeNull();
      expect(el.querySelector('.customer-home__more h3')).toBeNull();
      expect(el.querySelector('.customer-home__more tg-order-row')!.textContent).toContain('Em análise');
    });
  });

  describe('sessão', () => {
    it('válida: consulta endereço e pedidos com o id e monta o link', async () => {
      await setup(of([]));
      expect(addressService.getAddress).toHaveBeenCalledWith('user-1', 1);
      expect(orderService.getOrderByClient).toHaveBeenCalledWith('user-1');
      expect(component.addressLink()).toEqual(['/general', 'user-1', 'addresses']);
    });

    for (const [label, user] of [
      ['sessão nula (depois do logout)', null],
      ['sessão vazia ({})', {}],
      ['usuário ausente', { user: null }],
      ['id ausente', { user: { name: 'Ana' } }],
      ['id vazio', { user: { id: '  ', name: 'Ana' } }],
    ] as const) {
      it(`${label}: não lança, não consulta e não monta link com undefined`, async () => {
        await expectAsync(setup(of([]), user)).toBeResolved();
        expect(addressService.getAddress).not.toHaveBeenCalled();
        expect(orderService.getOrderByClient).not.toHaveBeenCalled();
        expect(component.addressLink()).toBeNull();
        expect(el.querySelector('.customer-home__address')).toBeNull();
        expect(el.innerHTML).not.toContain('undefined');
        expect(el.querySelector('tg-alert[role="alert"]')!.textContent).toContain('Não foi possível carregar seus pedidos');
      });
    }

    it('nome ausente: saudação só com "Olá" e o resto normal', async () => {
      await setup(of([order('1', 'AGENDADO')]), { user: { id: 'user-1' } });
      expect(el.querySelector('h1')!.textContent!.trim()).toBe('Olá');
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });

    it('sessão restaurada depois: "Tentar de novo" carrega e o link de endereço fica válido', async () => {
      await setup(of([]), {});
      session.set({ user: { id: 'user-2', name: 'Ana' } });
      orderService.getOrderByClient.and.returnValue(of([order('1', 'AGENDADO')]));
      el.querySelector<HTMLButtonElement>('tg-alert[role="alert"] button')!.click();
      fixture.detectChanges();
      expect(orderService.getOrderByClient).toHaveBeenCalledWith('user-2');
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
      expect(component.addressLink()).toEqual(['/general', 'user-2', 'addresses']);
    });
  });
});
