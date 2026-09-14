import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { environment } from '@environments/environment';
import { ProviderHomePage } from './home';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

const emptyHome = {
  earnings: { today: 0, month: 0, previousMonth: 0, lastSixMonths: [] },
  services: { completedTotal: 0, completedThisWeek: 0 },
  rating: { average: 0, count: 0 },
  pendingRequests: [],
  activeOrders: [],
  recentServices: [],
  insights: {
    mostRequestedService: null,
    averageTicket: 0,
    mostServedNeighborhood: null,
    monthlyGrowth: null,
  },
};
const pending = {
  id: '1',
  clientName: 'Maria',
  service: 'Reparo',
  scheduledFor: null,
  address: 'Centro',
  amount: 100,
  status: 'pending',
};

describe('ProviderHomePage fresh dashboard', () => {
  let component: ProviderHomePage;
  let fixture: ComponentFixture<ProviderHomePage>;
  let http: HttpTestingController;
  let order: any;
  const endpoint = environment.url + '/auth/provider-home';

  beforeEach(async () => {
    order = {
      confirmOrder: jasmine.createSpy().and.returnValue(of({})),
      cancelOrder: jasmine.createSpy().and.returnValue(of({})),
      updateOrderStatus: jasmine.createSpy().and.returnValue(of({})),
    };
    await TestBed.configureTestingModule({
      imports: [ProviderHomePage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Order, useValue: order },
        {
          provide: UserLoggedService,
          useValue: {
            user: () => ({
              user: { id: '17', name: 'João' },
              providerHome: { earnings: { today: 999999 } },
            }),
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProviderHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  it('loads server data on entry without showing cached or demo figures', () => {
    expect(component.loading()).toBeTrue();
    expect(component.summary).toEqual([]);
    expect(component.requests()).toEqual([]);
    http.expectOne(endpoint).flush(emptyHome);
    fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Você ainda não possui');
    expect(component.summary[0].value).not.toContain('999999');
    expect(fixture.nativeElement.textContent).not.toContain('6.000');
    expect(fixture.nativeElement.textContent).not.toContain('4.820');
  });

  it('refreshes new requests without a new login', () => {
    http.expectOne(endpoint).flush(emptyHome);
    component.refresh();
    http.expectOne(endpoint).flush({ ...emptyHome, pendingRequests: [pending] });
    expect(component.pendingCount()).toBe(1);
  });

  it('reloads the authoritative dashboard after acceptance', () => {
    http.expectOne(endpoint).flush({ ...emptyHome, pendingRequests: [pending] });
    component.updateRequestStatus('1', 'accepted');
    expect(order.confirmOrder).toHaveBeenCalledWith('1', '17');
    http.expectOne(endpoint).flush(emptyHome);
    expect(component.pendingCount()).toBe(0);
  });

  it('preserves pending state if mutation fails', () => {
    http.expectOne(endpoint).flush({ ...emptyHome, pendingRequests: [pending] });
    order.confirmOrder.and.returnValue(
      throwError(() => ({ error: { message: 'Pedido já respondido' } })),
    );
    component.updateRequestStatus('1', 'accepted');
    expect(component.requests()[0].status).toBe('pending');
    expect(component.requestError()).toBe('Pedido já respondido');
    http.expectNone(endpoint);
  });

  it('exposes errors and allows retry instead of demo fallback', () => {
    http.expectOne(endpoint).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(component.dashboardError()).toBeTruthy();
    expect(component.summary).toEqual([]);
    component.refresh();
    http.expectOne(endpoint).flush(emptyHome);
    expect(component.dashboardError()).toBe('');
  });

  it('refreshes after service status changes', () => {
    http.expectOne(endpoint).flush(emptyHome);
    component.updateActiveOrderStatus('42', 'EM_ANDAMENTO');
    expect(order.updateOrderStatus).toHaveBeenCalledWith('42', 'EM_ANDAMENTO');
    http.expectOne(endpoint).flush(emptyHome);
  });
});
