import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TgProviderCardComponent } from './tg-provider-card.component';
import type { TgProvider } from './tg-provider';

// Layout medido no navegador real do Karma: o card segue a largura do
// container, não a da janela.

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

const ana: TgProvider = {
  id: 'ana',
  name: 'Ana Souza',
  verified: true,
  rating: 4.9,
  ratingCount: 128,
  distanceKm: 1.2,
  service: 'Limpeza residencial',
  priceFrom: 120,
};

@Component({
  imports: [TgProviderCardComponent],
  template: `
    <div [style.width.px]="width()">
      <tg-provider-card [provider]="provider()" [link]="['/prestadores', provider().id]" [favorite]="favorite()" />
    </div>
  `,
})
class Host {
  readonly width = signal(560);
  readonly provider = signal<TgProvider>(ana);
  readonly favorite = signal<boolean | undefined>(false);
}

describe('TgProviderCardComponent (layout)', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const rect = (sel: string) => el.querySelector(sel)!.getBoundingClientRect();
  const render = (patch: Partial<{ width: number; provider: Partial<TgProvider>; favorite: boolean | undefined }>) => {
    if (patch.width != null) host.width.set(patch.width);
    if (patch.provider) host.provider.set({ ...ana, ...patch.provider });
    if ('favorite' in patch) host.favorite.set(patch.favorite);
    fixture.detectChanges();
  };
  const priceBelow = () => rect('.tg-provider-card__price').top >= rect('.tg-provider-card__info').bottom - 1;
  const priceRight = () => rect('.tg-provider-card__price').left >= rect('.tg-provider-card__info').right - 1;
  const noOverflow = () => {
    const card = el.querySelector<HTMLElement>('tg-card')!;
    const box = card.getBoundingClientRect();
    const inside = [...card.querySelectorAll<HTMLElement>('*')].every((n) => {
      const r = n.getBoundingClientRect();
      return r.width === 0 || (r.left >= box.left - 0.5 && r.right <= box.right + 0.5);
    });
    return inside && card.scrollWidth <= card.clientWidth;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    document.body.appendChild(el);
    fixture.detectChanges();
  });

  afterEach(() => el.remove());

  it('o Karma roda numa janela larga (a regra é do container, não da janela)', () => {
    expect(window.innerWidth).toBeGreaterThanOrEqual(600);
  });

  it('container largo (560 px): foto de 72 px, preço à direita, coração em cima', () => {
    render({ width: 560 });
    expect(rect('.tg-provider-card__photo').width).toBe(72);
    expect(priceRight()).toBeTrue();
    expect(priceBelow()).toBeFalse();
    expect(rect('.tg-provider-card__favorite').top).toBeLessThan(rect('.tg-provider-card__price').top);
    expect(rect('.tg-provider-card__favorite').width).toBe(44);
    expect(noOverflow()).toBeTrue();
  });

  it('container estreito (320 px) numa janela larga: foto de 56 px, preço embaixo, sem overflow', () => {
    render({ width: 320 });
    expect(rect('.tg-provider-card__photo').width).toBe(56);
    expect(priceBelow()).toBeTrue();
    expect(rect('.tg-provider-card__price').left).toBeLessThanOrEqual(rect('.tg-provider-card__photo').left + 1);
    expect(rect('.tg-provider-card__info').width).toBeGreaterThan(120);
    expect(noOverflow()).toBeTrue();
  });

  it('nome, serviço e preço longos quebram dentro do card, nas duas larguras', () => {
    for (const width of [280, 560]) {
      render({
        width,
        provider: {
          name: 'Maria Clara de Albuquerque Nogueira Vasconcelos',
          service: 'Montagem de móveis planejados e reparos em geral em apartamentos',
          priceFrom: 123456.78,
        },
      });
      expect(noOverflow()).withContext(`${width}`).toBeTrue();
      render({ provider: { name: 'Supercalifragilisticexpialidocious'.repeat(2) } });
      expect(noOverflow()).withContext(`${width} palavra sem quebra`).toBeTrue();
    }
  });

  it('sem coração e sem foto, o layout se mantém', () => {
    for (const width of [320, 560]) {
      render({ width, favorite: undefined, provider: { photoUrl: null } });
      expect(el.querySelector('.tg-provider-card__favorite')).toBeNull();
      expect(noOverflow()).withContext(`${width}`).toBeTrue();
      expect(width < 480 ? priceBelow() : priceRight()).withContext(`${width}`).toBeTrue();
    }
  });

  it('o coração fica acima do link esticado (clique nele não cai no link)', () => {
    render({ width: 560 });
    const fav = rect('.tg-provider-card__favorite');
    const hit = document.elementFromPoint(fav.left + fav.width / 2, fav.top + fav.height / 2);
    expect(hit?.closest('.tg-provider-card__favorite')).not.toBeNull();
    const card = rect('tg-card');
    const elsewhere = document.elementFromPoint(card.left + card.width / 2, card.bottom - 6);
    expect(elsewhere?.closest('a.tg-card__link')).not.toBeNull();
  });

  it('nos dois temas, o mesmo layout', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        render({ width: 320 });
        expect(priceBelow()).withContext(theme).toBeTrue();
        render({ width: 560 });
        expect(priceRight()).withContext(theme).toBeTrue();
        expect(noOverflow()).withContext(theme).toBeTrue();
      } finally {
        restore();
      }
    }
  });
});
