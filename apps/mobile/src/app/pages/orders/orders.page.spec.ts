import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular, RefresherCustomEvent } from '@ionic/angular';
import { Observable, of, Subject, throwError } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { OrderListItem } from '@app/core/orders/orders.models';
import { OrdersService } from '@app/core/orders/orders.service';
import { FakeAuth, otherCustomer } from '../../../testing/fakes';
import { OrdersPage } from './orders.page';

const order = (id: string, title: string): OrderListItem => ({
  id,
  status: 'AGUARDANDO_APROVACAO',
  scheduledFor: '2026-11-15T13:00:00.000Z',
  service: { title, provider: { user: { name: 'Carlos Lima' } } }
});
const ofA = order('99', 'Pedido da Ana');
const ofB = order('200', 'Pedido do Bruno');

/** Evento do ion-refresher com contagem de encerramentos. */
function refresher() {
  const complete = jasmine.createSpy('complete').and.resolveTo();
  return { event: { target: { complete } } as unknown as RefresherCustomEvent, complete };
}

describe('OrdersPage', () => {
  let auth: FakeAuth;
  let list: jasmine.Spy<() => Observable<readonly OrderListItem[]>>;
  let fixture: ComponentFixture<OrdersPage>;

  async function render(...responses: Observable<readonly OrderListItem[]>[]) {
    auth = new FakeAuth();
    list = jasmine.createSpy('list').and.returnValues(...responses);
    TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: { list } },
        { provide: AuthService, useValue: auth }
      ]
    });
    fixture = TestBed.createComponent(OrdersPage);
    await stable();
    return fixture.componentInstance;
  }

  async function stable() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('lists my orders with their status', async () => {
    await render(of([ofA]));
    expect(text()).toContain('Pedido da Ana');
    expect(text()).toContain('Carlos Lima');
    expect(text()).toContain('Aguardando o profissional');
    // Horário de Brasília, qualquer que seja o fuso do aparelho.
    expect(text()).toContain('15 de nov, 10:00');
    const item = fixture.nativeElement.querySelector('ion-item') as HTMLElement;
    expect(item.getAttribute('href')).toBe('/pedidos/99');
  });

  it('says when there are no orders yet', async () => {
    await render(of([]));
    expect(text()).toContain('Você ainda não fez nenhum pedido');
  });

  it('refreshes when the user comes back to the screen', async () => {
    const page = await render(of([ofA]), of([ofA]));
    page.ionViewWillEnter();
    await stable();
    expect(list).toHaveBeenCalledTimes(2);
  });

  describe('session isolation', () => {
    it('H: logout hides the orders immediately', async () => {
      await render(of([ofA]));
      expect(text()).toContain('Pedido da Ana');
      const page = fixture.componentInstance;
      auth.signOut();
      // Antes de qualquer detecção de mudanças ou requisição, o estado já não tem os dados.
      expect(page.state().status).toBe('idle');
      fixture.detectChanges();
      expect(text()).not.toContain('Pedido da Ana');
      await stable();
      expect(text()).not.toContain('Pedido da Ana');
      expect(list).toHaveBeenCalledTimes(1);
    });

    it('I: another account loads its own orders, never reusing the previous ones', async () => {
      const forB = new Subject<readonly OrderListItem[]>();
      await render(of([ofA]), forB);
      auth.signOut();
      auth.signIn(otherCustomer);
      await stable();
      expect(list).toHaveBeenCalledTimes(2);
      expect(text()).not.toContain('Pedido da Ana');
      forB.next([ofB]);
      await stable();
      expect(text()).toContain('Pedido do Bruno');
      expect(text()).not.toContain('Pedido da Ana');
    });

    it('J: a late answer for account A is dropped after B logs in', async () => {
      const forA = new Subject<readonly OrderListItem[]>();
      const forB = new Subject<readonly OrderListItem[]>();
      await render(forA, forB);
      auth.signOut();
      auth.signIn(otherCustomer);
      expect(fixture.componentInstance.state().status).toBe('loading');
      await stable();
      expect(forA.observed).toBeFalse(); // a busca de A foi cancelada
      forA.next([ofA]);
      forB.next([ofB]);
      await stable();
      expect(text()).not.toContain('Pedido da Ana');
      expect(text()).toContain('Pedido do Bruno');
    });

    it('M: a lost session (refresh refused) hides the data too', async () => {
      await render(of([ofA]));
      auth.signOut(); // o AuthService descarta a sessão quando o refresh é recusado
      fixture.detectChanges();
      expect(text()).not.toContain('Pedido da Ana');
    });
  });

  describe('pull to refresh', () => {
    it('S: finishes after success and keeps the list on screen meanwhile', async () => {
      const again = new Subject<readonly OrderListItem[]>();
      const page = await render(of([ofA]), again);
      const { event, complete } = refresher();
      page.refresh(event);
      await stable();
      expect(text()).toContain('Pedido da Ana');
      again.next([ofA, ofB]);
      again.complete();
      await stable();
      expect(complete).toHaveBeenCalledTimes(1);
      expect(text()).toContain('Pedido do Bruno');
    });

    it('T: finishes after an error', async () => {
      const page = await render(of([ofA]), throwError(() => new Error('offline')));
      const { event, complete } = refresher();
      page.refresh(event);
      await stable();
      expect(complete).toHaveBeenCalledTimes(1);
      expect(text()).toContain('Não foi possível carregar seus pedidos');
    });

    it('U: two refreshes in a row both finish, and only the latest answer is shown', async () => {
      const first = new Subject<readonly OrderListItem[]>();
      const second = new Subject<readonly OrderListItem[]>();
      const page = await render(of([]), first, second);
      const a = refresher();
      const b = refresher();
      page.refresh(a.event);
      page.refresh(b.event);
      expect(a.complete).toHaveBeenCalledTimes(1); // cancelado pelo segundo
      expect(b.complete).not.toHaveBeenCalled();
      first.next([ofA]);
      second.next([ofB]);
      second.complete();
      await stable();
      expect(b.complete).toHaveBeenCalledTimes(1);
      expect(a.complete).toHaveBeenCalledTimes(1);
      expect(text()).toContain('Pedido do Bruno');
      expect(text()).not.toContain('Pedido da Ana');
    });

    it('V: leaving the page finishes a pending refresh exactly once', async () => {
      const never = new Subject<readonly OrderListItem[]>();
      const page = await render(of([ofA]), never);
      const { event, complete } = refresher();
      page.refresh(event);
      page.ionViewWillLeave();
      expect(complete).toHaveBeenCalledTimes(1);
      never.next([ofB]);
      never.complete();
      await stable();
      expect(complete).toHaveBeenCalledTimes(1);
    });

    it('W: destroying the page finishes the refresh and ignores late answers', async () => {
      const never = new Subject<readonly OrderListItem[]>();
      const page = await render(of([ofA]), never);
      const { event, complete } = refresher();
      page.refresh(event);
      fixture.destroy();
      expect(complete).toHaveBeenCalledTimes(1);
      expect(never.observed).toBeFalse();
    });

    it('a refresher that fails to close does not cause an unhandled rejection', async () => {
      const page = await render(of([ofA]), of([ofA]));
      const complete = jasmine.createSpy('complete').and.rejectWith(new Error('gone'));
      page.refresh({ target: { complete } } as unknown as RefresherCustomEvent);
      await stable();
      expect(complete).toHaveBeenCalledTimes(1);
    });

    it('a refresh without a session just closes the refresher', async () => {
      const page = await render(of([ofA]));
      auth.signOut();
      const { event, complete } = refresher();
      page.refresh(event);
      expect(complete).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledTimes(1);
    });
  });
});
