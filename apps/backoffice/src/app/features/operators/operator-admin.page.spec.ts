import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';

import {
  AdminOperatorRecord,
  OperatorPage,
  OPERATOR_ROLE_OPTIONS
} from './operator-admin.models';
import { OperatorAdminPage } from './operator-admin.page';
import { OperatorAdminService } from './operator-admin.service';

describe('OperatorAdminPage', () => {
  let fixture: ComponentFixture<OperatorAdminPage>;
  let component: OperatorAdminPage;
  let service: jasmine.SpyObj<OperatorAdminService>;
  let routeQuery: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let routeSnapshotQuery = convertToParamMap({ page: '1', limit: '25' });
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routeQuery = new BehaviorSubject(routeSnapshotQuery);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    service = jasmine.createSpyObj<OperatorAdminService>('OperatorAdminService', [
      'list',
      'invite',
      'changeRole',
      'activate',
      'deactivate'
    ]);
    service.list.and.returnValue(of(operatorPage()));

    TestBed.configureTestingModule({
      imports: [OperatorAdminPage],
      providers: [
        provideZonelessChangeDetection(),
        { provide: OperatorAdminService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: routeQuery.asObservable(),
            snapshot: { queryParamMap: routeSnapshotQuery }
          }
        },
        { provide: Router, useValue: router }
      ]
    });

    fixture = TestBed.createComponent(OperatorAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders exactly the fixed role selector choices without custom permissions', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(component.roles).toEqual(OPERATOR_ROLE_OPTIONS);
    expect(text).toContain('Administrator');
    expect(text).toContain('Support');
    expect(text).toContain('Finance');
    expect(text).toContain('Moderator');
    expect(text).not.toContain('Permission editor');
    expect(text).not.toContain('Custom permission');
  });

  it('confirms role changes with immediate session invalidation copy', () => {
    const operator = component.page()!.data[0];
    component.updateSelectedRole(operator, 'FINANCE');

    component.openRoleChange(operator);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Change Alice Admin's role");
    expect(fixture.nativeElement.textContent).toContain('old Backoffice sessions are invalidated');
  });

  it('preserves current UI state and refreshes on final-Administrator conflicts', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: { message: 'Cannot remove the final active Administrator' }
    });
    const request = new Subject<never>();
    service.deactivate.and.returnValue(request.asObservable());
    const operator = component.page()!.data[0];

    component.openDeactivation(operator);
    component.confirmCommand();
    request.error(conflict);
    fixture.detectChanges();

    expect(component.page()!.data[0]).toEqual(operator);
    expect(component.conflict()).toContain('Alice Admin changed before this action');
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('refreshed without applying a local optimistic change');
  });

  it('activates and deactivates operators through confirmed actions', () => {
    service.activate.and.returnValue(of({ operator: inactiveOperator({ active: true }) }));
    service.deactivate.and.returnValue(
      of({ operator: { ...component.page()!.data[0], active: false } })
    );

    component.openActivation(component.page()!.data[1]);
    component.confirmCommand();
    expect(service.activate).toHaveBeenCalledWith('2');
    expect(component.announcement()).toBe('Sam Support was activated.');

    component.openDeactivation(component.page()!.data[0]);
    component.confirmCommand();
    expect(service.deactivate).toHaveBeenCalledWith('1');
    expect(component.announcement()).toContain('was deactivated and old sessions were invalidated');
  });

  it('changes roles successfully and resets pending selections after reload', () => {
    const operator = component.page()!.data[1];
    service.changeRole.and.returnValue(of({ operator: { ...operator, role: 'FINANCE' } }));

    component.updateSelectedRole(operator, 'FINANCE');
    component.openRoleChange(operator);
    component.confirmCommand();

    expect(service.changeRole).toHaveBeenCalledWith('2', 'FINANCE');
    expect(component.announcement()).toContain('Old sessions were invalidated');
    expect(component.selectedRole(operator)).toBe('SUPPORT');
  });

  it('invites Support operators and reloads the list', () => {
    service.invite.and.returnValue(
      of({
        operator: inactiveOperator({ name: 'Sam Support', email: 'sam@example.com' }),
        invitation: { expiresAt: '2026-07-06T12:00:00.000Z', deliveryStatus: 'SENT' }
      })
    );

    component.inviteForm.set({ name: 'Sam Support', email: 'sam@example.com', role: 'SUPPORT' });
    component.submitInvitation();

    expect(service.invite).toHaveBeenCalledWith({
      name: 'Sam Support',
      email: 'sam@example.com',
      role: 'SUPPORT'
    });
    expect(component.announcement()).toBe('Invitation sent to sam@example.com.');
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it('resends pending invitations through safe invitation rotation', () => {
    service.invite.and.returnValue(
      of({
        operator: inactiveOperator(),
        invitation: { expiresAt: '2026-07-06T12:00:00.000Z', deliveryStatus: 'SENT' }
      })
    );
    const operator = component.page()!.data[1];

    component.openResend(operator);
    component.confirmCommand();

    expect(service.invite).toHaveBeenCalledWith({
      name: operator.name,
      email: operator.email,
      role: operator.role
    });
  });

  it('shows API validation errors for failed invitations', () => {
    service.invite.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Already active' } }))
    );

    component.inviteForm.set({ name: 'Alice Admin', email: 'alice@example.com', role: 'SUPPORT' });
    component.submitInvitation();

    expect(component.formError()).toBe('Already active');
  });

  it('validates invitation input before calling the API', () => {
    component.inviteForm.set({ name: '', email: '', role: 'SUPPORT' });

    component.submitInvitation();

    expect(service.invite).not.toHaveBeenCalled();
    expect(component.formError()).toBe('Enter the operator name, email, and one fixed role.');
  });

  it('shows action errors for non-conflict failures', () => {
    service.deactivate.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: 'Downstream failure' }))
    );

    component.openDeactivation(component.page()!.data[0]);
    component.confirmCommand();

    expect(component.error()).toBe('Downstream failure');
  });

  it('shows a visible error when operators cannot load', () => {
    service.list.and.returnValue(throwError(() => new Error('network')));

    routeQuery.next(convertToParamMap({ page: '1' }));
    fixture.detectChanges();

    expect(component.error()).toBe('Operator list could not be loaded.');
    expect(fixture.nativeElement.textContent).toContain('Operator list could not be loaded.');
  });

  it('parses and clears route filters defensively', () => {
    const parsed = component.queryFromParamMap(
      convertToParamMap({
        page: '-1',
        limit: 'abc',
        role: 'NOT_A_ROLE',
        active: 'maybe',
        search: 'sam'
      })
    );

    expect(parsed).toEqual({ page: 1, limit: 25, search: 'sam', role: undefined, active: undefined });

    component.filters.set({ search: 'sam', role: 'SUPPORT', active: 'false' });
    component.clearFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 1, limit: 25 }
    });
  });

  it('ignores no-op and invalid role changes before confirmation', () => {
    const operator = component.page()!.data[0];

    component.updateSelectedRole(operator, 'NOT_A_ROLE');
    component.openRoleChange(operator);

    expect(component.confirmation()).toBeNull();
  });

  it('updates URL filters with bounded paging inputs', () => {
    component.filters.set({ search: 'alice', role: 'ADMINISTRATOR', active: 'true' });

    component.applyFilters();

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { page: 1, limit: 25, search: 'alice', role: 'ADMINISTRATOR', active: true }
    });
  });
});

function operatorPage(): OperatorPage<AdminOperatorRecord> {
  return {
    data: [
      {
        id: '1',
        name: 'Alice Admin',
        email: 'alice@example.com',
        role: 'ADMINISTRATOR',
        active: true,
        activatedAt: '2026-07-04T12:00:00.000Z'
      },
      inactiveOperator()
    ],
    meta: { total: 2, page: 1, limit: 25, totalPages: 1, hasPrevPage: false, hasNextPage: false }
  };
}

function inactiveOperator(overrides: Partial<AdminOperatorRecord> = {}): AdminOperatorRecord {
  return {
    id: '2',
    name: 'Sam Support',
    email: 'sam@example.com',
    role: 'SUPPORT',
    active: false,
    activatedAt: null,
    ...overrides
  };
}
