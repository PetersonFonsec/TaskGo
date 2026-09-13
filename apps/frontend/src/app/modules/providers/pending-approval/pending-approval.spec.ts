import { of } from 'rxjs';
import { Order } from '@shared/service/order/order';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingApproval } from './pending-approval';

describe('PendingApproval', () => {
  let component: PendingApproval;
  let fixture: ComponentFixture<PendingApproval>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingApproval],
      providers: [
        provideRouter([]),
        { provide: Order, useValue: { getOrderSumary: () => of({}) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingApproval);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
