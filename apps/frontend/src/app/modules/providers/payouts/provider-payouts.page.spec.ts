import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProviderPayoutStatusResponse } from '@taskgo/shared';
import { environment } from '@environments/environment';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ProviderPayoutsPage } from './provider-payouts.page';

const notConfigured: ProviderPayoutStatusResponse = {
  syncStatus: 'NOT_CONFIGURED',
  payoutReady: false,
  bankAccount: null,
  updatedAt: null,
  errorCode: null,
};
const ready: ProviderPayoutStatusResponse = {
  syncStatus: 'READY',
  payoutReady: true,
  bankAccount: {
    bankName: null,
    bankCode: '341',
    branchLastDigits: '34',
    accountLastDigits: '6543',
  },
  updatedAt: '2026-09-30T12:00:00.000Z',
  errorCode: null,
};

describe('ProviderPayoutsPage', () => {
  let fixture: ComponentFixture<ProviderPayoutsPage>;
  let component: ProviderPayoutsPage;
  let http: HttpTestingController;
  const endpoint = environment.url + '/provider/me/payout';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderPayoutsPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: UserLoggedService,
          useValue: {
            user: () => ({ user: { id: '17', name: 'Maria Prestadora', cpf: '52998224725' } }),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProviderPayoutsPage);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const statusBadge = () =>
    (fixture.nativeElement as HTMLElement).querySelector('[data-testid="payout-status"]')
      ?.textContent;

  it('shows a pending state when no account is configured', () => {
    http.expectOne(endpoint).flush(notConfigured);
    fixture.detectChanges();

    expect(statusBadge()).toContain('Pendente');
    expect(component.draft.holderName).toBe('Maria Prestadora');
    expect(component.draft.holderDocument).toBe('52998224725');
  });

  it('shows the masked account when ready', () => {
    http.expectOne(endpoint).flush(ready);
    fixture.detectChanges();

    expect(statusBadge()).toContain('Pronto para receber');
    expect(text()).toContain('Itaú Unibanco');
    expect(text()).toContain('•••6543');
  });

  it('shows the review state for a recipient under analysis', () => {
    http.expectOne(endpoint).flush({ ...ready, syncStatus: 'PENDING', payoutReady: false });
    fixture.detectChanges();

    expect(statusBadge()).toContain('Em análise');
  });

  it('shows a readable gateway error', () => {
    http.expectOne(endpoint).flush({ ...notConfigured, errorCode: 'VALIDATION' });
    fixture.detectChanges();

    expect(statusBadge()).toContain('Erro no cadastro');
    expect(text()).toContain('O Pagar.me recusou os dados informados');
  });

  it('sends normalized data and clears account numbers after saving', () => {
    http.expectOne(endpoint).flush(notConfigured);
    component.draft = {
      ...component.draft,
      holderDocument: '529.982.247-25',
      bankChoice: '341',
      branchNumber: '1234',
      accountNumber: '98765-4',
      accountCheckDigit: '1',
    };

    component.save();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      holderName: 'Maria Prestadora',
      holderType: 'INDIVIDUAL',
      holderDocument: '52998224725',
      bankCode: '341',
      branchNumber: '1234',
      branchCheckDigit: null,
      accountNumber: '987654',
      accountCheckDigit: '1',
      accountType: 'CHECKING',
    });
    request.flush(ready);
    fixture.detectChanges();

    expect(component.message()).toContain('enviados');
    expect(component.draft.accountNumber).toBe('');
    expect(statusBadge()).toContain('Pronto para receber');
  });

  it('uses the typed code for banks outside the list', () => {
    http.expectOne(endpoint).flush(notConfigured);
    component.draft = {
      ...component.draft,
      bankChoice: component.otherBank,
      customBankCode: '212',
      branchNumber: '1',
      accountNumber: '1',
      accountCheckDigit: '1',
    };

    component.save();
    const request = http.expectOne(endpoint);
    expect(request.request.body.bankCode).toBe('212');
    request.flush(ready);
  });

  it('shows validation messages returned by the API', () => {
    http.expectOne(endpoint).flush(notConfigured);

    component.save();
    http
      .expectOne(endpoint)
      .flush({ message: ['CPF do titular inválido'] }, { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();

    expect(component.error()).toBe('CPF do titular inválido');
    expect(component.busy()).toBeFalse();
  });

  it('allows retrying when loading fails', () => {
    http.expectOne(endpoint).flush(null, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(component.loadError()).toContain('Não foi possível carregar');

    component.load();
    http.expectOne(endpoint).flush(notConfigured);
    expect(component.loadError()).toBe('');
  });
});
