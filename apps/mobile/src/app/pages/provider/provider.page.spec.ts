import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { SECURE_STORE } from '@app/core/auth/session-storage';
import { Availability, ProviderProfile, SavedAddress } from '@app/core/orders/orders.models';
import { OrdersService } from '@app/core/orders/orders.service';
import { FakeAuth, MemorySecureStore, otherCustomer, settle } from '../../../testing/fakes';
import { ProviderPage } from './provider.page';

const profile: ProviderProfile = {
  id: '10',
  bio: 'Eletricista há 10 anos.',
  ratingAvg: 4.8,
  ratingCount: 12,
  verified: true,
  user: { name: 'Carlos Lima', photoUrl: null },
  services: [
    { id: '1', title: 'Troca de chuveiro', basePrice: 150 },
    { id: '2', title: 'Instalação de tomada', basePrice: 90 }
  ],
  reviews: [{ id: '5', rating: 5, comment: 'Muito pontual', reviewedAt: '2026-10-01T12:00:00.000Z' }]
};

function agenda(serviceId: string): Availability {
  return {
    providerId: '10',
    timezone: 'America/Sao_Paulo',
    days: [
      { date: '2026-11-14', available: false, slots: [] },
      {
        date: '2026-11-15',
        available: true,
        slots: [
          { startsAt: '2026-11-15T12:00:00.000Z', endsAt: '2026-11-15T13:00:00.000Z', serviceId, label: '09:00', available: false },
          { startsAt: '2026-11-15T13:00:00.000Z', endsAt: '2026-11-15T14:00:00.000Z', serviceId, label: '10:00', available: true }
        ]
      }
    ]
  };
}

const home: SavedAddress = { id: '7', label: 'Casa', street: 'Rua A', number: '10', lat: -23.7, lng: -46.5 };
const work: SavedAddress = { id: '8', label: 'Trabalho', street: 'Rua B', number: '20', lat: -23.6, lng: -46.6, isDefault: true };

describe('ProviderPage', () => {
  let orders: jasmine.SpyObj<OrdersService>;
  let auth: FakeAuth;
  let store: MemorySecureStore;
  let navigate: jasmine.Spy;

  async function render(options: { signedIn?: boolean; addresses?: readonly SavedAddress[] } = {}) {
    auth = new FakeAuth(options.signedIn === false ? null : undefined);
    store = new MemorySecureStore();
    orders = jasmine.createSpyObj<OrdersService>('OrdersService', [
      'provider',
      'availability',
      'addresses',
      'create',
      'list'
    ]);
    orders.provider.and.returnValue(of(profile));
    orders.availability.and.callFake((_p, serviceId) => of(agenda(serviceId)));
    orders.addresses.and.returnValue(of(options.addresses ?? [home, work]));
    orders.list.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [ProviderPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: orders },
        { provide: AuthService, useValue: auth },
        { provide: SECURE_STORE, useValue: store }
      ]
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ProviderPage);
    fixture.componentRef.setInput('id', '10');
    await stable(fixture);
    return fixture;
  }

  async function stable(fixture: ComponentFixture<ProviderPage>) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = (fixture: ComponentFixture<ProviderPage>) =>
    (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('shows the profile, services, free slots and reviews', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;

    expect(orders.provider).toHaveBeenCalledWith('10');
    expect(orders.availability).toHaveBeenCalledWith('10', '1');
    expect(text(fixture)).toContain('Carlos Lima');
    expect(text(fixture)).toContain('4,8 (12 avaliações)');
    expect(text(fixture)).toContain('R$ 90,00');
    expect(text(fixture)).toContain('Muito pontual');
    // Dia sem vaga e horário ocupado não aparecem; o primeiro dia livre já vem escolhido.
    expect(page.days().map((d) => d.date)).toEqual(['2026-11-15']);
    expect(page.date()).toBe('2026-11-15');
    expect(page.slots().map((s) => s.label)).toEqual(['10:00']);
    expect(page.timeLabel('2026-11-15T13:00:00.000Z')).toBe('10:00');
    // Endereço padrão vem pré-selecionado.
    expect(page.addressId()).toBe('8');
    expect(page.canSubmit()).toBeFalse();
  });

  it('reloads the agenda and clears the slot when the service changes', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    page.selectSlot('2026-11-15T13:00:00.000Z');
    expect(page.slot()).not.toBeNull();

    page.selectService('2');
    await stable(fixture);

    expect(orders.availability).toHaveBeenCalledWith('10', '2');
    expect(page.slot()).toBeNull();
    expect(page.service()?.title).toBe('Instalação de tomada');
  });

  it('sends the order with the chosen slot and address and opens it', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    orders.create.and.returnValue(of({ id: '99' }));
    page.selectAddress('7');
    page.selectSlot('2026-11-15T13:00:00.000Z');
    expect(page.canSubmit()).toBeTrue();

    await page.submit();

    expect(orders.create).toHaveBeenCalledOnceWith(
      { serviceId: '1', scheduledFor: '2026-11-15T13:00:00.000Z', addressId: '7' },
      jasmine.stringMatching(/^[0-9a-f-]{36}$/)
    );
    expect(store.log[0]).toBe('set order_intent_7'); // gravada antes do envio
    expect(navigate).toHaveBeenCalledWith(['/pedidos', '99'], { replaceUrl: true });
  });

  it('never sends the same order twice while the first is on its way', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    const response = new Subject<{ id: string }>();
    orders.create.and.returnValue(response);
    page.selectSlot('2026-11-15T13:00:00.000Z');

    const first = page.submit();
    expect(page.canSubmit()).toBeFalse();
    await page.submit();
    response.next({ id: '99' });
    response.complete();
    await first;

    expect(orders.create).toHaveBeenCalledTimes(1);
  });

  it('E: explains a refused order and lets the customer pick another slot', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    orders.create.and.returnValues(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'Selected scheduled slot is no longer available' }
          })
      ),
      of({ id: '100' })
    );
    page.selectSlot('2026-11-15T13:00:00.000Z');

    await page.submit();
    await stable(fixture);

    expect(text(fixture)).toContain('Esse horário não está mais disponível');
    expect(page.slot()).toBeNull();
    expect(page.submitting()).toBeFalse();
    expect(navigate).not.toHaveBeenCalled();

    page.selectSlot('2026-11-15T13:00:00.000Z');
    expect(page.error()).toBeNull();
    await page.submit();
    expect(orders.create).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/pedidos', '100'], { replaceUrl: true });
  });

  it('C/D: a lost answer blocks new orders, survives a slot change and resolves with the same key', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    orders.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    page.selectSlot('2026-11-15T13:00:00.000Z');

    await page.submit();
    await stable(fixture);

    expect(text(fixture)).toContain('Não sabemos se o seu último pedido chegou ao TaskGo');
    expect(text(fixture)).toContain('Troca de chuveiro');
    expect(text(fixture)).toContain('Ver meus pedidos');
    expect(page.canSubmit()).toBeFalse();

    // Outro horário não libera um novo pedido nem descarta o pendente.
    page.selectSlot('2026-11-15T13:00:00.000Z');
    await page.submit();
    expect(page.pending()).not.toBeNull();
    expect(orders.create).toHaveBeenCalledTimes(1);

    // "Tentar de novo" repete a mesma chave; a API devolve o pedido já criado.
    orders.create.and.returnValue(of({ id: '99' }));
    await page.retry();
    const [first, second] = orders.create.calls.allArgs();
    expect(second).toEqual(first);
    expect(navigate).toHaveBeenCalledWith(['/pedidos', '99'], { replaceUrl: true });
    expect(orders.list).not.toHaveBeenCalled();
  });

  it('I: a key conflict on the retry asks to check the orders and blocks new orders until then', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    orders.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    page.selectSlot('2026-11-15T13:00:00.000Z');
    await page.submit();
    orders.create.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { errorCode: 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH', message: ['x'] }
          })
      )
    );
    await page.retry();
    await stable(fixture);

    expect(text(fixture)).toContain('Não conseguimos confirmar esta solicitação');
    expect(page.pending()).toBeNull();
    page.selectSlot('2026-11-15T13:00:00.000Z');
    expect(page.canSubmit()).toBeFalse();
    await page.submit();
    expect(orders.create).toHaveBeenCalledTimes(2);

    await page.reviewOrders();
    expect(navigate).toHaveBeenCalledWith(['/pedidos']);
    expect(page.conflict()).toBeNull();
    expect(store.data.has('order_intent_7')).toBeFalse();
  });

  it('B: when the device cannot save the attempt nothing is sent and the slot stays chosen', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    store.failNext('set');
    page.selectSlot('2026-11-15T13:00:00.000Z');
    await page.submit();
    await stable(fixture);
    expect(orders.create).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Não foi possível guardar o pedido neste aparelho');
    expect(page.slot()).not.toBeNull();
  });

  it('F: reopening the page after a restart shows the pending attempt again', async () => {
    const fixture = await render();
    // Tentativa gravada por uma execução anterior do app, ainda sem resultado.
    store.data.set(
      'order_intent_7',
      JSON.stringify({
        id: '5d7f2c4a-1b3e-4f6a-9c8d-0e1f2a3b4c5d',
        userId: '7',
        serviceId: '1',
        scheduledFor: '2026-11-15T13:00:00.000Z',
        addressId: '8',
        startedAt: new Date().toISOString(),
        summary: 'Troca de chuveiro'
      })
    );
    orders.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    auth.signOut();
    auth.signIn(); // como abrir o app de novo com a sessão salva
    await stable(fixture);
    await settle();
    fixture.detectChanges();
    expect(fixture.componentInstance.pending()).not.toBeNull();
    expect(text(fixture)).toContain('Não sabemos se o seu último pedido chegou');
  });

  it('G: the pending attempt of account A is not shown to account B', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    orders.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    page.selectSlot('2026-11-15T13:00:00.000Z');
    await page.submit();
    expect(page.pending()).not.toBeNull();

    auth.signOut();
    auth.signIn(otherCustomer);
    await stable(fixture);
    await settle();
    expect(page.pending()).toBeNull();
    expect(text(fixture)).not.toContain('Não sabemos se o seu último pedido');
  });

  it('asks anonymous visitors to log in and come back', async () => {
    const fixture = await render({ signedIn: false });
    const page = fixture.componentInstance;

    expect(orders.addresses).not.toHaveBeenCalled();
    expect(text(fixture)).toContain('Entrar para solicitar');
    expect(page.canSubmit()).toBeTrue();

    await page.submit();

    expect(orders.create).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { voltar: '/prestadores/10' } });
  });

  it('says how to proceed when the customer has no usable address', async () => {
    const fixture = await render({ addresses: [] });
    fixture.componentInstance.selectSlot('2026-11-15T13:00:00.000Z');
    await stable(fixture);

    expect(text(fixture)).toContain('Cadastre um no site do TaskGo');
    expect(fixture.componentInstance.canSubmit()).toBeFalse();
  });

  it('shows when the provider is no longer available', async () => {
    orders = jasmine.createSpyObj<OrdersService>('OrdersService', ['provider']);
    TestBed.configureTestingModule({
      imports: [ProviderPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: orders },
        { provide: AuthService, useValue: new FakeAuth(null) }
      ]
    });
    orders.provider.and.returnValue(of(null));
    const fixture = TestBed.createComponent(ProviderPage);
    fixture.componentRef.setInput('id', '10');
    await stable(fixture);
    expect(text(fixture)).toContain('não está disponível no momento');
  });

  it('shows an error when the profile fails to load', async () => {
    orders = jasmine.createSpyObj<OrdersService>('OrdersService', ['provider']);
    TestBed.configureTestingModule({
      imports: [ProviderPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: OrdersService, useValue: orders },
        { provide: AuthService, useValue: new FakeAuth(null) }
      ]
    });
    orders.provider.and.returnValue(throwError(() => new Error('x')));
    const fixture = TestBed.createComponent(ProviderPage);
    fixture.componentRef.setInput('id', '10');
    await stable(fixture);
    expect(text(fixture)).toContain('Não foi possível carregar este profissional');
  });
});
