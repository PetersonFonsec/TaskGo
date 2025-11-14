import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, Renderer2, RendererFactory2 } from '@angular/core';
import { Roles } from '@shared/enums/roles.enum';
import { CustomerTheme, ProviderTheme, ThemeColors } from './theme.model';

@Injectable({
  providedIn: 'root'
})
export class Theme {
  #platformId = inject(PLATFORM_ID);
  private renderer: Renderer2;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  setVar(name: string, value: string, target: HTMLElement = document.documentElement) {
    if (!isPlatformBrowser(this.#platformId)) return;
    this.renderer.setStyle(target, name, value);
  }

  setTheme(role: Roles = Roles.CUSTOMER) {
    if(role == Roles.CUSTOMER) this.setCustomerTheme();
    if(role == Roles.PROVIDER) this.setProviderTheme();
  }

  setProviderTheme()  {
    const provider = new ProviderTheme();
    const customer = new CustomerTheme();
    this.updateColors('primary', provider);
    this.updateColors('secondary', customer);
  }

  setCustomerTheme() {
    const provider = new ProviderTheme();
    const customer = new CustomerTheme();
    this.updateColors('primary', customer);
    this.updateColors('secondary', provider);
  }

  updateColors(color: string, theme: ThemeColors) {
    this.setVar(`--color-${color}`, theme.color);
    this.setVar(`--color-${color}-rgb`, theme.rgb);
    this.setVar(`--color-${color}-contrast`, theme.contrast);
    this.setVar(`--color-${color}-contrast-rgb`, theme.contrastRgb);
  }
}
