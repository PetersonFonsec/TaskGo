import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderHomePage } from './home';

describe('ProviderHomePage', () => {
  let component: ProviderHomePage;
  let fixture: ComponentFixture<ProviderHomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderHomePage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderHomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update a request status', () => {
    component.updateRequestStatus(1, 'accepted');

    expect(component.requests().find(({ id }) => id === 1)?.status).toBe('accepted');
    expect(component.pendingCount()).toBe(2);
  });
});
