import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CategoryService, useValue: { getCategories: () => of({ data: [] }) } },
        { provide: Order, useValue: { getOrderByClient: () => of([]) } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { id: 'user-1' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
