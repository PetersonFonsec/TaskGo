import { of } from 'rxjs';
import { Address as AddressService } from '@shared/service/address/address';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListCardAddress } from './list-card-address';

describe('ListCardAddress', () => {
  let component: ListCardAddress;
  let fixture: ComponentFixture<ListCardAddress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListCardAddress],
      providers: [
        { provide: AddressService, useValue: { getAddress: () => of({ data: [] }) } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { id: 'user-1' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListCardAddress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
