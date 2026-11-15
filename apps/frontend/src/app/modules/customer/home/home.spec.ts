import { provideRouter } from '@angular/router';
import { Address } from '@shared/service/address/address';
import { Observable, of, Subject, throwError } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { Order } from '@shared/service/order/order';
import { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  async function setup(orders: Observable<OrdersResponse> = of([])) {
    orderService.getOrderByClient.and.returnValue(orders);
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: Address, useValue: addressService },
        { provide: CategoryService, useValue: categoryService },
        { provide: Order, useValue: orderService },
        {
          provide: UserLoggedService,
          useValue: { user: () => ({ user: { id: 'user-1', name: userName } }) },
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

    it('a ilustração é decorativa', async () => {
      await setup();
      expect(el.querySelector('.customer-home__art')!.getAttribute('alt')).toBe('');
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

    it('renderiza a miniatura e mantém o link da busca', () => {
      const thumb = 'https://imagedelivery.net/Bpbv9d8J9NqFhm--zUdxEA/limpeza/public';
      component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb } as ICategory]);
      fixture.detectChanges();
      const image = el.querySelector('.category-grid img')!;
      expect(image.getAttribute('src')).toBe(thumb);
      expect(image.getAttribute('alt')).toBe('Limpeza');
      expect(el.querySelector('.category-grid a')!.getAttribute('href')).toBe(
        '/customer/search?categoria=limpeza',
      );
    });

    it('mostra o nome sem imagem quebrada quando não há miniatura', () => {
      component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb: null } as ICategory]);
      fixture.detectChanges();
      expect(el.querySelector('.category-grid img')).toBeNull();
      expect(el.querySelector('.category-grid')!.textContent).toContain('Limpeza');
    });

    it('uma falha nas categorias não impede a agenda', async () => {
      TestBed.resetTestingModule();
      categoryService.getCategories.and.returnValue(throwError(() => new Error('offline')));
      await setup(of([order('1', 'AGENDADO')]));
      expect(el.querySelector('tg-appointment-card')).not.toBeNull();
    });
  });

  it('não usa mais os componentes antigos da tela', async () => {
    await setup(of([order('1', 'AGENDADO'), order('2', 'CONCLUIDO')]));
    for (const legacy of ['app-banner', 'app-card-appointment', 'app-card-service-history', 'app-slider', 'app-button', 'fa-icon']) {
      expect(el.querySelector(legacy)).withContext(legacy).toBeNull();
    }
  });
});
