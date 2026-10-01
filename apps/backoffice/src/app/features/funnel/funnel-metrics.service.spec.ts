import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BACKOFFICE_ENVIRONMENT } from '@app/core/config/backoffice-environment.token';

import { FunnelMetricsService } from './funnel-metrics.service';

describe('FunnelMetricsService', () => {
  let service: FunnelMetricsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: BACKOFFICE_ENVIRONMENT,
          useValue: {
            production: false,
            apiUrl: 'http://localhost:3000/admin',
            adminTokenStorageKey: 'proxi.backoffice.test.adminToken',
          },
        },
      ],
    });

    service = TestBed.inject(FunnelMetricsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('requests the default funnel window without query parameters', () => {
    service.funnel({}).subscribe();

    const request = http.expectOne('http://localhost:3000/admin/metrics/funnel');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({});
  });

  it('sends the selected date range', () => {
    service
      .funnel({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z' })
      .subscribe();

    const request = http.expectOne(
      (req) => req.url === 'http://localhost:3000/admin/metrics/funnel',
    );
    expect(request.request.params.get('from')).toBe('2026-09-01T00:00:00.000Z');
    expect(request.request.params.get('to')).toBe('2026-09-30T23:59:59.999Z');
    request.flush({});
  });
});
