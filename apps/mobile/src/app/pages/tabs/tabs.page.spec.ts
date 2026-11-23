import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';

import { routes } from '../../app.routes';
import { TAB_DESTINATIONS, TabsPage } from './tabs.page';

describe('TabsPage', () => {
  it('shows only the destinations the app has, in the web order', () => {
    // Buscar, Favoritos e Conta não existem no app: sem aba que não leva a lugar nenhum.
    expect(TAB_DESTINATIONS.map((d) => d.label)).toEqual(['Início', 'Pedidos']);
  });

  it('renders one tab button per destination, with a visible label', () => {
    TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideZonelessChangeDetection(), provideIonicAngular(), provideRouter([])]
    });
    const fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('ion-tab-button') as NodeListOf<
        HTMLElement & { tab?: string }
      >
    );
    // [tab] é propriedade do ion-tab-button, não atributo.
    expect(buttons.map((b) => b.tab)).toEqual(['inicio', 'pedidos']);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Início', 'Pedidos']);
  });

  it('keeps "/" and "/pedidos" as tab routes and detail screens outside the tabs', () => {
    const tabs = routes.find((r) => r.path === '');
    expect(tabs?.children?.map((c) => c.path)).toEqual(['', 'inicio', 'pedidos']);
    expect(tabs?.children?.find((c) => c.path === 'pedidos')?.canActivate?.length).toBe(1);
    const topLevel = routes.map((r) => r.path);
    expect(topLevel).toContain('pedidos/:id');
    expect(topLevel).toContain('categorias/:slug');
    expect(topLevel).toContain('prestadores/:id');
    expect(topLevel).toContain('entrar');
  });
});
