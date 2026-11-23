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

function iconNames(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ion-header ion-button ion-icon')).map(
    (icon) => icon.getAttribute('name') ?? ''
  );
}

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
    // Visual do DS: barra clara e ícones tg-*.
    const toolbar = fixture.nativeElement.querySelector('ion-toolbar') as HTMLElement;
    expect(toolbar.hasAttribute('color')).toBeFalse();
    expect(iconNames(fixture.nativeElement)).toEqual(['tg-user-circle']);
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
    const alert = fixture.nativeElement.querySelector('.tg-alert') as HTMLElement;
    expect(alert.classList).toContain('tg-alert--danger');
    expect(alert.getAttribute('role')).toBe('alert');
    expect(alert.textContent).toContain('Não foi possível carregar as categorias');
    expect(alert.querySelector('ion-icon')?.getAttribute('name')).toBe('tg-warning-circle');
  });

  it('greets a logged-in customer and lets them log out', () => {
    user.set(customer);
    const fixture = render({ categories: () => of(categories) });
    expect(fixture.nativeElement.textContent).toContain('Olá, Ana!');
    expect(iconNames(fixture.nativeElement)).toEqual(['tg-receipt', 'tg-sign-out']);
    const logoutButton = fixture.nativeElement.querySelector('ion-button[aria-label="Sair"]') as HTMLElement;
    expect(logoutButton.textContent?.trim()).toBe('Sair');
    fixture.componentInstance.logout();
    expect(auth.logout).toHaveBeenCalled();
  });
});
