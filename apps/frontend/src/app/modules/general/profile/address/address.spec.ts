import { of } from 'rxjs';
import { Address as AddressService } from '@shared/service/address/address';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Address } from './address';

describe('Address', () => {
  let component: Address;
  let fixture: ComponentFixture<Address>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Address],
      providers: [
        { provide: AddressService, useValue: { getAddress: () => of({ data: [] }) } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { id: 'user-1' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Address);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
