import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { of, throwError } from 'rxjs';

import { CatalogService } from '@app/core/catalog/catalog.service';
import { PublicProvider } from '@app/core/catalog/catalog.models';
import { CategoryPage } from './category.page';

const rated: PublicProvider = {
  id: '10',
  ratingAvg: '4.8',
  ratingCount: 12,
  verified: true,
  user: { name: 'Carlos Lima', photoUrl: null },
  services: [
    { id: '1', title: 'Troca de chuveiro', basePrice: 150 },
    { id: '2', title: 'Instalação de tomada', basePrice: 90 }
  ]
};
const newcomer: PublicProvider = {
  id: '11',
  ratingAvg: 0,
  ratingCount: 0,
  user: { name: 'Bia Rocha' },
  services: []
};

describe('CategoryPage', () => {
  async function render(catalog: Partial<CatalogService>) {
    TestBed.configureTestingModule({
      imports: [CategoryPage],
      providers: [
        provideZonelessChangeDetection(),
        provideIonicAngular(),
        provideRouter([]),
        { provide: CatalogService, useValue: catalog }
      ]
    });
    const fixture = TestBed.createComponent(CategoryPage);
    fixture.componentRef.setInput('slug', 'eletrica');
    fixture.componentRef.setInput('nome', 'Elétrica');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('lists providers of the category with rating and starting price', async () => {
    const providersByCategory = jasmine.createSpy().and.returnValue(of([rated, newcomer]));
    const fixture = await render({ providersByCategory });
    const text = (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

    expect(providersByCategory).toHaveBeenCalledWith('eletrica');
    expect(text).toContain('Elétrica');
    expect(text).toContain('Carlos Lima');
    expect(text).toContain('4,8 (12)');
    expect(text).toContain('R$ 90,00');
    expect(text).toContain('Bia Rocha');
    expect(text).toContain('Novo no TaskGo');
    const item = fixture.nativeElement.querySelector('ion-item') as HTMLElement;
    expect(item.getAttribute('href')).toBe('/prestadores/10');
  });

  it('says when nobody serves the category yet', async () => {
    const fixture = await render({ providersByCategory: () => of([]) });
    expect(fixture.nativeElement.textContent).toContain('Ainda não há profissionais nesta categoria');
  });

  it('shows an error when the search fails', async () => {
    const fixture = await render({ providersByCategory: () => throwError(() => new Error('x')) });
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar os profissionais');
  });
});
