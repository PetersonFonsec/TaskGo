import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TgProviderCardComponent } from './tg-provider-card.component';
import type { TgProvider } from './tg-provider';

const ana: TgProvider = {
  id: '101',
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
    <tg-provider-card
      [provider]="provider()"
      [link]="['/customer', provider().id]"
      [favorite]="favorite()"
      [headingLevel]="$any(level())"
      (favoriteChange)="changes.push($event)" />
  `,
})
class Host {
  readonly provider = signal<TgProvider>(ana);
  readonly favorite = signal<boolean | undefined>(undefined);
  readonly level = signal<unknown>(3);
  readonly changes: boolean[] = [];
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('TgProviderCardComponent', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  let el: HTMLElement;

  const set = (patch: Partial<TgProvider>) => {
    host.provider.set({ ...ana, ...patch });
    fixture.detectChanges();
  };
  const q = (sel: string) => el.querySelector<HTMLElement>(sel);

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('é um tg-card com o nome como link esticado para o perfil, num h3', () => {
    const link = q('a.tg-card__link')!;
    expect(q('tg-card.tg-card')).not.toBeNull();
    expect(text(link)).toBe('Ana Souza');
    expect(link.getAttribute('href')).toBe('/customer/101');
    expect(link.parentElement!.tagName).toBe('H3');
    expect(el.querySelectorAll('a').length).toBe(1);
  });

  it('nível do título: inteiro de 2 a 6; outro valor vira h3', () => {
    const cases: [unknown, string][] = [
      [2, 'H2'], [3, 'H3'], [4, 'H4'], [5, 'H5'], [6, 'H6'], ['4', 'H4'],
      [3.5, 'H3'], [1, 'H3'], [7, 'H3'], [NaN, 'H3'], [Infinity, 'H3'], ['abc', 'H3'], [null, 'H3'],
    ];
    for (const [level, tag] of cases) {
      host.level.set(level);
      fixture.detectChanges();
      const headings = el.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).withContext(String(level)).toBe(1);
      expect(headings[0].tagName).withContext(String(level)).toBe(tag);
    }
  });

  it('selo "Verificado" só quando verificado', () => {
    expect(text(q('tg-badge'))).toBe('Verificado');
    set({ verified: false });
    expect(el.querySelectorAll('tg-badge').length).toBe(0);
  });

  it('nota visível "4,9 (128)" e, para o leitor, por extenso', () => {
    const rating = q('.tg-provider-card__rating')!;
    expect(text(rating.querySelector(':scope > span[aria-hidden="true"]'))).toBe('4,9 (128)');
    expect(text(q('.tg-provider-card__sr'))).toBe('Nota 4,9 de 5, 128 avaliações');
    set({ rating: 5, ratingCount: 1 });
    expect(text(q('.tg-provider-card__sr'))).toBe('Nota 5,0 de 5, 1 avaliação');
    set({ rating: 4.25, ratingCount: 1500 });
    expect(text(q('.tg-provider-card__sr'))).toBe('Nota 4,3 de 5, 1.500 avaliações');
    set({ rating: 1, ratingCount: 2 });
    expect(text(q('.tg-provider-card__sr'))).toBe('Nota 1,0 de 5, 2 avaliações');
  });

  it('nota: só de 1 a 5; fora disso, "Novo no TaskGo" (nunca truncada para 5,0)', () => {
    const cases: [number | null, string | null][] = [
      [4.9, '4,9'],
      [5, '5,0'],
      [0, null],
      [-1, null],
      [0.5, null],
      [5.1, null],
      [9, null],
      [NaN, null],
      [Infinity, null],
      [null, null],
    ];
    for (const [rating, shown] of cases) {
      set({ rating, ratingCount: 10 });
      const ctx = String(rating);
      if (shown) {
        expect(text(q('.tg-provider-card__rating b'))).withContext(ctx).toBe(shown);
        expect(q('.tg-badge--accent')).withContext(ctx).toBeNull();
      } else {
        expect(q('.tg-provider-card__rating')).withContext(ctx).toBeNull();
        expect(q('.tg-provider-card__sr')).withContext(ctx).toBeNull();
        expect(text(q('.tg-badge--accent'))).withContext(ctx).toBe('Novo no TaskGo');
        expect(text(el)).withContext(ctx).not.toContain('5,0');
      }
    }
  });

  it('contagem: só inteiro positivo; zero, negativa, fracionária ou ausente vira "Novo no TaskGo"', () => {
    for (const ratingCount of [0, -3, 2.5, NaN, Infinity, null, undefined]) {
      set({ rating: 4.5, ratingCount });
      const ctx = String(ratingCount);
      expect(q('.tg-provider-card__rating')).withContext(ctx).toBeNull();
      expect(text(q('.tg-badge--accent'))).withContext(ctx).toBe('Novo no TaskGo');
      expect(text(el)).withContext(ctx).not.toContain('0,0');
    }
    set({ rating: 4.5, ratingCount: 3 });
    expect(text(q('.tg-provider-card__sr'))).toBe('Nota 4,5 de 5, 3 avaliações');
  });

  it('distância com uma casa; sem valor válido, some', () => {
    expect(text(q('.tg-provider-card__distance'))).toBe('1,2 km');
    set({ distanceKm: 0 });
    expect(text(q('.tg-provider-card__distance'))).toBe('0,0 km');
    for (const distanceKm of [null, undefined, -1, NaN, Infinity]) {
      set({ distanceKm });
      expect(q('.tg-provider-card__distance')).withContext(String(distanceKm)).toBeNull();
    }
  });

  it('serviço aparece quando existe', () => {
    expect(text(q('.tg-provider-card__service'))).toBe('Limpeza residencial');
    set({ service: '  ' });
    expect(q('.tg-provider-card__service')).toBeNull();
  });

  it('preço "a partir de" em reais; sem preço válido, "Preço sob consulta"', () => {
    const price = () => text(q('.tg-provider-card__price')).replace(/ /g, ' ');
    expect(price()).toBe('a partir de R$ 120');
    set({ priceFrom: 99.9 });
    expect(price()).toBe('a partir de R$ 99,90');
    set({ priceFrom: 1250 });
    expect(price()).toBe('a partir de R$ 1.250');
    for (const priceFrom of [null, 0, -5, NaN]) {
      set({ priceFrom });
      expect(price()).withContext(String(priceFrom)).toBe('Preço sob consulta');
    }
  });

  it('não mostra os dados fixos do card antigo', () => {
    for (const fake of ['Aceita pix', 'Disponivel 24 horas', 'Disponível 24 horas', 'Aceita Cartão', '3,1 km de você', 'Profissional próximo']) {
      expect(text(el)).not.toContain(fake);
    }
  });

  describe('favorito', () => {
    it('sem valor, não há coração', () => {
      expect(q('.tg-provider-card__favorite')).toBeNull();
    });

    it('botão com aria-pressed e o nome do prestador; o clique pede a troca e não abre o perfil', () => {
      const router = TestBed.inject(Router);
      const navigate = spyOn(router, 'navigateByUrl').and.callThrough();
      host.favorite.set(false);
      fixture.detectChanges();
      const button = q('.tg-provider-card__favorite') as HTMLButtonElement;
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-pressed')).toBe('false');
      expect(button.getAttribute('aria-label')).toBe('Favoritar Ana Souza');
      button.click();
      expect(host.changes).toEqual([true]);
      expect(navigate).not.toHaveBeenCalled();

      host.favorite.set(true);
      fixture.detectChanges();
      expect(button.getAttribute('aria-pressed')).toBe('true');
      button.click();
      expect(host.changes).toEqual([true, false]);
    });

    it('o estado fica com a tela: o clique não muda o coração sozinho', () => {
      host.favorite.set(false);
      fixture.detectChanges();
      q('.tg-provider-card__favorite')!.click();
      fixture.detectChanges();
      expect(q('.tg-provider-card__favorite')!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('foto', () => {
    it('com foto: imagem decorativa (alt vazio)', () => {
      set({ photoUrl: 'https://example.invalid/ana.jpg' });
      const img = q('.tg-provider-card__photo img') as HTMLImageElement;
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('src')).toBe('https://example.invalid/ana.jpg');
    });

    it('se a foto falhar, mostra as iniciais; uma URL nova tenta de novo', () => {
      set({ photoUrl: 'https://example.invalid/a.jpg' });
      q('.tg-provider-card__photo img')!.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(q('.tg-provider-card__photo img')).toBeNull();
      expect(text(q('.tg-provider-card__photo'))).toBe('AS');
      set({ photoUrl: 'https://example.invalid/b.jpg' });
      expect(q('.tg-provider-card__photo img')).not.toBeNull();
    });

    it('sem foto: iniciais do primeiro e do último nome, escondidas do leitor', () => {
      set({ photoUrl: null });
      expect(text(q('.tg-provider-card__photo'))).toBe('AS');
      expect(q('.tg-provider-card__photo span')!.getAttribute('aria-hidden')).toBe('true');
      set({ name: 'carlos' });
      expect(text(q('.tg-provider-card__photo'))).toBe('C');
      set({ name: 'Maria Clara de Albuquerque Nogueira' });
      expect(text(q('.tg-provider-card__photo'))).toBe('MN');
      set({ name: '  ' });
      expect(text(q('.tg-provider-card__photo'))).toBe('?');
    });
  });

  it('Tab: o nome (perfil) e depois o coração; nada recebe foco sozinho', () => {
    host.favorite.set(false);
    fixture.detectChanges();
    const focusables = [...el.querySelectorAll<HTMLElement>('a[href], button, [tabindex]')].filter(
      (node) => node.tabIndex >= 0,
    );
    expect(focusables.map((n) => n.className.split(' ')[0])).toEqual(['tg-card__link', 'tg-provider-card__favorite']);
    expect(el.contains(document.activeElement)).toBeFalse();
  });
});

@Component({ template: '<p id="perfil">perfil</p>' })
class ProfileStub {}

@Component({
  imports: [TgProviderCardComponent],
  template: `
    <tg-provider-card [provider]="provider" [link]="['/customer', provider.id]" [favorite]="false" />
  `,
})
class RoutedHost {
  readonly provider: TgProvider = { ...ana, id: '101' };
}

// Navegação real com a forma da rota do app: /customer/:userId (o parâmetro
// recebe o id do Provider; a tela busca GET /provider/:id).
describe('TgProviderCardComponent (navegação)', () => {
  let fixture: ComponentFixture<RoutedHost>;
  let router: Router;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'customer/:userId', component: ProfileStub },
          { path: '**', children: [] },
        ]),
      ],
    });
    fixture = TestBed.createComponent(RoutedHost);
    router = TestBed.inject(Router);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await router.navigateByUrl('/customer/search');
  });

  it('href aponta para o perfil público com o id do Provider', () => {
    expect(el.querySelector('a.tg-card__link')!.getAttribute('href')).toBe('/customer/101');
  });

  it('clique no nome navega para /customer/101', async () => {
    (el.querySelector('a.tg-card__link') as HTMLElement).click();
    await fixture.whenStable();
    expect(router.url).toBe('/customer/101');
  });

  it('clique no coração não navega', async () => {
    (el.querySelector('.tg-provider-card__favorite') as HTMLElement).click();
    await fixture.whenStable();
    expect(router.url).toBe('/customer/search');
  });
});
