import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { CatalogService } from '@app/core/catalog/catalog.service';
import { Category } from '@app/core/catalog/catalog.models';
import { customer } from '../../../testing/fakes';
import { HomePage } from './home.page';

const categories: Category[] = [
  { id: 1, name: 'Elétrica', slug: 'eletrica', description: 'Tomadas e chuveiros' },
  { id: 2, name: 'Pintura', slug: 'pintura' }
];

describe('HomePage', () => {
  const user = signal<typeof customer | null>(null);
  const auth = {
    user,
    isAuthenticated: () => user() !== null,
    logout: jasmine.createSpy('logout').and.resolveTo()
  };

  function render(catalog: Partial<CatalogService>) {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: CatalogService, useValue: catalog },
        { provide: AuthService, useValue: auth }
      ]
    });
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => user.set(null));

  it('lists categories with a link to each one', () => {
    const fixture = render({ categories: () => of(categories) });
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Elétrica');
    expect(text).toContain('Pintura');
    expect(text).toContain('Entrar');
  });

  it('filters categories as the customer types', () => {
    const fixture = render({ categories: () => of(categories) });
    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: 'eletr' } }));
    fixture.detectChanges();
    expect(fixture.componentInstance.visible().map((c) => c.slug)).toEqual(['eletrica']);

    // A descrição também conta: "chuveiro" acha Elétrica.
    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: 'chuveiro' } }));
    expect(fixture.componentInstance.visible().map((c) => c.slug)).toEqual(['eletrica']);

    fixture.componentInstance.onSearch(new CustomEvent('ionInput', { detail: { value: 'jardim' } }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma categoria com "jardim"');
  });

  it('shows a clear message when categories fail to load', () => {
    const fixture = render({ categories: () => throwError(() => new Error('offline')) });
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as categorias');
  });

  it('greets a logged-in customer and lets them log out', () => {
    user.set(customer);
    const fixture = render({ categories: () => of(categories) });
    expect(fixture.nativeElement.textContent).toContain('Olá, Ana!');
    fixture.componentInstance.logout();
    expect(auth.logout).toHaveBeenCalled();
  });
});
