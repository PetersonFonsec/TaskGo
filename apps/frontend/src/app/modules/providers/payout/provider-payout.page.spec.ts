import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProviderPayoutPage } from './provider-payout.page';
import { environment } from '@environments/environment';

describe('ProviderPayoutPage', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProviderPayoutPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads and saves only the authenticated provider destination', () => {
    const fixture = TestBed.createComponent(ProviderPayoutPage);
    fixture.detectChanges();
    http
      .expectOne(environment.url + '/payments/payout-destination')
      .flush({ type: 'EMAIL', key: 'own@example.test' });
    http
      .expectOne(environment.url + '/payments/payout-destination/settlements')
      .flush([{ orderId: '1', amount: 88, status: 'PENDING', completedAt: null }]);
    expect(fixture.componentInstance.key).toBe('own@example.test');
    fixture.componentInstance.save();
    const save = http.expectOne(environment.url + '/payments/payout-destination');
    expect(save.request.method).toBe('PUT');
    expect(save.request.body).toEqual({ type: 'EMAIL', key: 'own@example.test' });
    save.flush({});
    expect(fixture.componentInstance.message()).toBe('Chave PIX salva.');
    expect(fixture.componentInstance.label('PENDING')).toBe('Em processamento');
  });
  it('keeps an error visible when saving fails', () => {
    const fixture = TestBed.createComponent(ProviderPayoutPage);
    fixture.componentInstance.key = 'bad';
    fixture.componentInstance.save();
    http
      .expectOne(environment.url + '/payments/payout-destination')
      .flush({}, { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance.error()).toContain('Confira');
    expect(fixture.componentInstance.busy()).toBeFalse();
  });
});
