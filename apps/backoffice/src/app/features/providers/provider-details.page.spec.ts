import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import { AdminOperator } from '@app/core/auth/admin-session.model';

import { ProviderDetails, ProviderPage, ProviderDecision, ProviderStatus } from './provider-admin.models';
import { ProviderAdminService } from './provider-admin.service';
import { ProviderDetailsPage } from './provider-details.page';

describe('ProviderDetailsPage', () => {
  let fixture: ComponentFixture<ProviderDetailsPage>;
  let component: ProviderDetailsPage;
  let service: jasmine.SpyObj<ProviderAdminService>;
  let operatorSignal: ReturnType<typeof signal<AdminOperator | null>>;

  beforeEach(() => {
    const params = new BehaviorSubject(convertToParamMap({ id: '42' }));
    service = jasmine.createSpyObj<ProviderAdminService>('ProviderAdminService', [
      'get',
      'history',
      'approve',
      'reject',
      'block',
      'unblock'
    ]);
    service.get.and.returnValue(of({ provider: provider('PENDING') }));
    service.history.and.returnValue(of(emptyHistory()));
    service.approve.and.returnValue(of(lifecycle('APPROVED')));
    service.reject.and.returnValue(of(lifecycle('REJECTED')));
    service.block.and.returnValue(of(lifecycle('BLOCKED')));
    service.unblock.and.returnValue(of(lifecycle('APPROVED')));
    operatorSignal = signal<AdminOperator | null>(adminOperator('ADMINISTRATOR'));

    TestBed.configureTestingModule({
      imports: [ProviderDetailsPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ProviderAdminService, useValue: service },
        { provide: AdminAuthService, useValue: { operator: operatorSignal } },
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } }
      ]
    });

    fixture = TestBed.createComponent(ProviderDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('shows actions only for Administrator and valid provider states', () => {
    component.provider.set(provider('PENDING'));
    expect(component.actions().map((action) => action.action)).toEqual(['APPROVE', 'REJECT']);

    component.provider.set(provider('APPROVED'));
    expect(component.actions().map((action) => action.action)).toEqual(['BLOCK']);

    component.provider.set(provider('BLOCKED'));
    expect(component.actions().map((action) => action.action)).toEqual(['UNBLOCK']);

    component.provider.set(provider('REJECTED'));
    expect(component.actions()).toEqual([]);

    operatorSignal.set(adminOperator('SUPPORT'));
    component.provider.set(provider('PENDING'));
    expect(component.actions()).toEqual([]);
  });

  it('prevents blank reject, block, and unblock submissions', () => {
    component.provider.set(provider('PENDING'));
    component.openDecision('REJECT');
    component.submitDecision();
    expect(service.reject).not.toHaveBeenCalled();
    expect(component.dialog()?.validation).toContain('requires an operational reason');

    component.provider.set(provider('APPROVED'));
    component.openDecision('BLOCK');
    component.submitDecision();
    expect(service.block).not.toHaveBeenCalled();

    component.provider.set(provider('BLOCKED'));
    component.openDecision('UNBLOCK');
    component.submitDecision();
    expect(service.unblock).not.toHaveBeenCalled();
  });

  it('submits reasoned reject, block, and unblock commands', () => {
    component.provider.set(provider('PENDING'));
    component.openDecision('REJECT');
    component.updateReason(' Missing document ');
    component.submitDecision();
    expect(service.reject).toHaveBeenCalledWith('42', 'Missing document');

    component.provider.set(provider('APPROVED'));
    component.openDecision('BLOCK');
    component.updateReason(' Operational risk ');
    component.submitDecision();
    expect(service.block).toHaveBeenCalledWith('42', 'Operational risk');

    component.provider.set(provider('BLOCKED'));
    component.openDecision('UNBLOCK');
    component.updateReason(' Review cleared ');
    component.submitDecision();
    expect(service.unblock).toHaveBeenCalledWith('42', 'Review cleared');
  });

  it('refreshes stale state and announces 409 conflicts', () => {
    service.approve.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, statusText: 'Conflict' }))
    );
    component.provider.set(provider('PENDING'));

    component.openDecision('APPROVE');
    component.submitDecision();

    expect(component.conflict()).toContain('status changed');
    expect(service.get).toHaveBeenCalledWith('42');
    expect(service.history).toHaveBeenCalledWith('42', { page: 1, limit: 100 });
  });
});

function adminOperator(role: AdminOperator['role']): AdminOperator {
  return {
    id: '7',
    name: 'Admin Operator',
    email: 'admin@example.com',
    role,
    active: true,
    activatedAt: '2026-07-04T12:00:00.000Z'
  };
}

function provider(status: ProviderStatus): ProviderDetails {
  return {
    id: '42',
    submittedAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-07-02T12:00:00.000Z',
    identity: {
      id: '101',
      name: 'Provider Example',
      email: 'provider@example.com',
      phone: '+5511999999999',
      cpf: '12345678900',
      photoUrl: null,
      userCreatedAt: '2026-07-01T12:00:00.000Z'
    },
    verification: {
      providerVerified: status === 'APPROVED',
      emailVerified: true,
      phoneVerified: true
    },
    status: { current: status, changedAt: '2026-07-02T12:00:00.000Z' },
    serviceSummary: { count: 1 },
    reviewSummary: { averageRating: 4.8, ratingCount: 4, reviewCount: 4 },
    decisionSummary: { count: 0 },
    capabilities: {
      acceptsPix: true,
      acceptsCard: true,
      emergencyCare: false,
      available24h: false
    },
    bio: 'Provider under review',
    paymentContext: { pagarmeRecipientId: 'rp_123' },
    services: [],
    serviceAreas: [],
    locations: [],
    operationalHistory: {
      ordersByStatus: [],
      recentOrders: []
    },
    decisionContext: {
      latestDecision: null,
      recentDecisions: [],
      firstDecisionAt: null
    }
  };
}

function emptyHistory(): ProviderPage<ProviderDecision> {
  return {
    data: [],
    meta: { total: 0, page: 1, limit: 100, totalPages: 1 }
  };
}

function lifecycle(status: ProviderStatus) {
  return {
    provider: {
      id: '42',
      verification: { providerVerified: status === 'APPROVED' },
      status: { current: status, changedAt: '2026-07-04T12:00:00.000Z' }
    }
  };
}
