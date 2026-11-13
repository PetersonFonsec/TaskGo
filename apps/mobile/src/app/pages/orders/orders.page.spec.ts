import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular, RefresherCustomEvent } from '@ionic/angular';
import { Observable, of, throwError } from 'rxjs';

import { OrderListItem } from '@app/core/orders/orders.models';
import { OrdersService } from '@app/core/orders/orders.service';
import { OrdersPage } from './orders.page';

const order: OrderListItem = {
  id: '99',
  status: 'AGUARDANDO_APROVACAO',
  scheduledFor: '2026-11-15T13:00:00.000Z',
  service: { title: 'Troca de chuveiro', provider: { user: { name: 'Carlos Lima' } } }
};

describe('OrdersPage', () => {
  let list: jasmine.Spy<() => Observable<readonly OrderListItem[]>>;

  async function render(first: Observable<readonly OrderListItem[]>) {
    list = jasmine.createSpy('list').and.returnValue(first);
    TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: { list } }
      ]
    });
    const fixture = TestBed.createComponent(OrdersPage);
    await stable(fixture);
    return fixture;
  }

  async function stable(fixture: ComponentFixture<OrdersPage>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (fixture: ComponentFixture<OrdersPage>) =>
    (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('lists my orders with their status', async () => {
    const fixture = await render(of([order]));
    expect(text(fixture)).toContain('Troca de chuveiro');
    expect(text(fixture)).toContain('Carlos Lima');
    expect(text(fixture)).toContain('Aguardando o profissional');
    // Horário de Brasília, qualquer que seja o fuso do aparelho.
    expect(text(fixture)).toContain('15 de nov, 10:00');
    const item = fixture.nativeElement.querySelector('ion-item') as HTMLElement;
    expect(item.getAttribute('href')).toBe('/pedidos/99');
  });

  it('says when there are no orders yet', async () => {
    const fixture = await render(of([]));
    expect(text(fixture)).toContain('Você ainda não fez nenhum pedido');
  });

  it('keeps the list on screen while pulling to refresh and closes the refresher', async () => {
    const fixture = await render(throwError(() => new Error('offline')));
    expect(text(fixture)).toContain('Não foi possível carregar seus pedidos');

    list.and.returnValue(of([order]));
    const complete = jasmine.createSpy('complete').and.resolveTo();
    fixture.componentInstance.refresh({ target: { complete } } as unknown as RefresherCustomEvent);
    await stable(fixture);

    expect(text(fixture)).toContain('Troca de chuveiro');
    expect(complete).toHaveBeenCalled();
  });

  it('refreshes when the user comes back to the screen', async () => {
    const fixture = await render(of([order]));
    fixture.componentInstance.ionViewWillEnter();
    await stable(fixture);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
