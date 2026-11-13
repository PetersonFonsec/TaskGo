import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { API } from '../../../testing/fakes';
import {
  availabilityRange,
  createOrderErrorMessage,
  decimal,
  orderStatusColor,
  orderStatusLabel,
  OrdersService
} from './orders.service';

describe('OrdersService', () => {
  let orders: OrdersService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MOBILE_ENVIRONMENT, useValue: { production: false, apiUrl: API } }
      ]
    });
    orders = TestBed.inject(OrdersService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the public provider profile with prices and rating as numbers', async () => {
    const result = firstValueFrom(orders.provider('10'));
    // Formato que a API devolve hoje para campos Decimal neste endpoint.
    http.expectOne(`${API}/provider/10`).flush({
      id: '10',
      ratingAvg: { s: 1, e: 0, d: [4, 8000000] },
      services: [
        { id: '1', title: 'A', basePrice: { s: 1, e: 1, d: [60] } },
        { id: '2', title: 'B', basePrice: 150.5 }
      ]
    });
    const provider = await result;
    expect(provider?.ratingAvg).toBe(4.8);
    expect(provider?.services.map((s) => s.basePrice)).toEqual([60, 150.5]);
  });

  it('keeps a missing provider as null', async () => {
    const result = firstValueFrom(orders.provider('404'));
    http.expectOne(`${API}/provider/404`).flush(null);
    expect(await result).toBeNull();
  });

  it('asks for 14 days of slots of the chosen service', async () => {
    // 25/12/2026 às 9h em São Paulo.
    const result = firstValueFrom(orders.availability('10', '3', new Date('2026-12-25T12:00:00Z')));
    const request = http.expectOne((r) => r.url === `${API}/provider/10/availability`);
    expect(request.request.params.get('from')).toBe('2026-12-25');
    expect(request.request.params.get('to')).toBe('2027-01-07');
    expect(request.request.params.get('serviceId')).toBe('3');
    request.flush({ providerId: '10', timezone: 'America/Sao_Paulo', days: [] });
    expect((await result).days).toEqual([]);
  });

  it('keeps only active addresses that have a location', async () => {
    const result = firstValueFrom(orders.addresses());
    http.expectOne(`${API}/user/me/addresses?limit=100`).flush({
      data: [
        { id: '1', lat: -23.7, lng: -46.5 },
        { id: '2', lat: null, lng: null },
        { id: '3', lat: -23.6, lng: -46.6, active: false }
      ]
    });
    expect((await result).map((a) => a.id)).toEqual(['1']);
  });

  it('creates the order marked as coming from the app', async () => {
    const result = firstValueFrom(
      orders.create(
        { serviceId: '3', scheduledFor: '2026-11-20T12:00:00.000Z', addressId: '1' },
        'b7e0c1f2-3a4d-4e5f-8a9b-0c1d2e3f4a5b'
      )
    );
    const request = http.expectOne(`${API}/orders`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('b7e0c1f2-3a4d-4e5f-8a9b-0c1d2e3f4a5b');
    expect(request.request.body).toEqual({
      serviceId: '3',
      scheduledFor: '2026-11-20T12:00:00.000Z',
      addressId: '1',
      channel: 'APP'
    });
    request.flush({ id: '99' });
    expect((await result).id).toBe('99');
  });

  it('lists my orders and opens one', async () => {
    const list = firstValueFrom(orders.list());
    http.expectOne(`${API}/orders`).flush([{ id: '1' }]);
    expect((await list).length).toBe(1);
    const one = firstValueFrom(orders.details('1'));
    http.expectOne(`${API}/orders/1`).flush({ id: '1' });
    expect((await one).id).toBe('1');
  });
});

describe('availabilityRange (agenda em São Paulo)', () => {
  const days = (from: string, to: string) =>
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;

  it('N: starts today in São Paulo and covers exactly 14 calendar days', () => {
    const range = availabilityRange(new Date('2026-11-13T19:00:00Z')); // 16h em SP
    expect(range).toEqual({ from: '2026-11-13', to: '2026-11-26' });
    expect(days(range.from, range.to)).toBe(14);
  });

  it('O: near midnight it follows São Paulo, not UTC', () => {
    // 02:30 UTC do dia 14 ainda é 23:30 do dia 13 em São Paulo.
    expect(availabilityRange(new Date('2026-11-14T02:30:00Z')).from).toBe('2026-11-13');
    // 03:00 UTC do dia 14 já é meia-noite do dia 14 em São Paulo.
    expect(availabilityRange(new Date('2026-11-14T03:00:00Z')).from).toBe('2026-11-14');
  });

  it('P: never reads the device time zone, so Tokyo or Los Angeles get the same range', () => {
    // Karma não troca o fuso do navegador; o teste garante que o fuso local nem é consultado.
    const local = ['getFullYear', 'getMonth', 'getDate', 'getHours', 'getTimezoneOffset'] as const;
    const spies = local.map((name) => spyOn(Date.prototype, name).and.callThrough());
    // Mesmo instante: 09:30 de 14/11 em Tóquio, 16:30 de 13/11 em Los Angeles.
    const range = availabilityRange(new Date('2026-11-14T00:30:00Z'));
    expect(range).toEqual({ from: '2026-11-13', to: '2026-11-26' });
    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });

  it('Q: crosses the new year', () => {
    expect(availabilityRange(new Date('2026-12-25T15:00:00Z'))).toEqual({
      from: '2026-12-25',
      to: '2027-01-07'
    });
  });

  it('R: crosses month ends, including February of a leap year', () => {
    const november = availabilityRange(new Date('2026-11-25T15:00:00Z'));
    expect(november).toEqual({ from: '2026-11-25', to: '2026-12-08' });
    const february = availabilityRange(new Date('2028-02-20T15:00:00Z'));
    expect(february).toEqual({ from: '2028-02-20', to: '2028-03-04' });
    expect(days(february.from, february.to)).toBe(14);
  });
});

describe('order helpers', () => {
  it('reads decimal.js values in every shape', () => {
    expect(decimal(12)).toBe(12);
    expect(decimal('99.9')).toBe(99.9);
    expect(decimal({ s: 1, e: 0, d: [0] })).toBe(0);
    expect(decimal({ s: 1, e: 2, d: [150, 5000000] })).toBe(150.5);
    expect(decimal({ s: 1, e: 7, d: [1, 2345678] })).toBe(12345678);
    expect(decimal({ s: -1, e: -2, d: [500000] })).toBe(-0.05);
    expect(decimal({ s: 1, e: 0, d: [] })).toBeNaN();
    expect(decimal(null)).toBeNaN();
  });

  const rejected = (message: string | string[], status = 400) =>
    new HttpErrorResponse({ status, error: { message } });

  it('explains why the API refused the order', () => {
    expect(createOrderErrorMessage(rejected('Selected scheduled slot is no longer available'))).toContain(
      'horário não está mais disponível'
    );
    expect(createOrderErrorMessage(rejected('Choose a future scheduled slot'))).toContain('Escolha outro');
    expect(createOrderErrorMessage(rejected('Address is outside the provider service area'))).toContain(
      'não atende'
    );
    expect(
      createOrderErrorMessage(rejected(['Select a complete active address belonging to the client']))
    ).toContain('incompleto');
    expect(createOrderErrorMessage(rejected('Service is not available'))).toContain('não está disponível');
    expect(createOrderErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Sem conexão');
    expect(createOrderErrorMessage(new Error('x'))).toContain('Tente de novo');
  });

  it('names every order status in plain words', () => {
    expect(orderStatusLabel('AGUARDANDO_APROVACAO')).toBe('Aguardando o profissional');
    expect(orderStatusLabel('EM_DESLOCAMENTO')).toBe('Profissional a caminho');
    expect(orderStatusLabel('NOVO_STATUS')).toBe('Em atualização');
    expect(orderStatusColor('CONCLUIDO')).toBe('success');
    expect(orderStatusColor('CANCELADO')).toBe('medium');
    expect(orderStatusColor('AGUARDANDO_PAGAMENTO')).toBe('warning');
    expect(orderStatusColor('AGENDADO')).toBe('primary');
  });
});
