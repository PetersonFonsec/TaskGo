import { provideRouter } from '@angular/router';
import { Address } from '@shared/service/address/address';
import { of, throwError } from 'rxjs';
import { CategoryService } from '@shared/service/category/category';
import { Order } from '@shared/service/order/order';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Home } from './home';
import { ICategory } from '@shared/service/category/category.model';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  const addressService = { getAddress: jasmine.createSpy('getAddress') };

  beforeEach(async () => {
    addressService.getAddress.and.returnValue(of({ data: [] }));
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: Address, useValue: addressService },
        { provide: CategoryService, useValue: { getCategories: () => of({ data: [] }) } },
        { provide: Order, useValue: { getOrderByClient: () => of([]) } },
        { provide: UserLoggedService, useValue: { user: () => ({ user: { id: 'user-1' } }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the address CTA when no address is registered', () => {
    const link = fixture.nativeElement.querySelector('.address-reminder__action');
    expect(link.textContent).toContain('Cadastrar endereço');
    expect(link.getAttribute('href')).toBe('/general/user-1/addresses');
  });

  it('hides the reminder when an address exists', () => {
    addressService.getAddress.and.returnValue(of({ data: [{ id: 'address-1' }] }));
    component.ngOnInit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.address-reminder')).toBeNull();
  });

  it('does not treat a failed lookup as a missing address', () => {
    addressService.getAddress.and.returnValue(throwError(() => new Error('Unavailable')));
    component.ngOnInit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.address-reminder')).toBeNull();
  });

  it('renders the category thumbnail and preserves the search link', () => {
    const thumb = 'https://imagedelivery.net/Bpbv9d8J9NqFhm--zUdxEA/limpeza/public';
    component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb } as ICategory]);
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.category-grid img');
    expect(image.getAttribute('src')).toBe(thumb);
    expect(image.getAttribute('alt')).toBe('Limpeza');
    expect(fixture.nativeElement.querySelector('.category-grid a').getAttribute('href')).toBe('/customer/search?categoria=limpeza');
  });

  it('shows the category name without a broken image when no thumbnail exists', () => {
    component.categories.set([{ id: 1, name: 'Limpeza', slug: 'limpeza', thumb: null } as ICategory]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.category-grid img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.category-grid').textContent).toContain('Limpeza');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
