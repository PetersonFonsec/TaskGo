import { Component, ViewEncapsulation, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgCardAppearance, TgCardComponent, TgCardLinkDirective } from './tg-card.component';

// Ações secundárias encapsuladas em componentes da tela.
@Component({
  selector: 'app-fav-emulated',
  template: `<button type="button" (click)="pressed()()">Favoritar</button>`,
  styles: `button { width: 80px; height: 32px; }`,
})
class FavEmulatedComponent {
  readonly pressed = input.required<() => void>();
}

@Component({
  selector: 'app-fav-shadow',
  encapsulation: ViewEncapsulation.ShadowDom,
  template: `<button type="button" (click)="pressed()()">Compartilhar</button>`,
  styles: `button { width: 80px; height: 32px; }`,
})
class FavShadowComponent {
  readonly pressed = input.required<() => void>();
}

@Component({
  imports: [TgCardComponent, TgCardLinkDirective, FavEmulatedComponent, FavShadowComponent],
  template: `
    @for (a of appearances; track a) {
      <tg-card [id]="'card-' + a" [appearance]="a" style="display:block;width:360px;margin-bottom:16px">
        <h3 style="margin:0"><a tgCardLink class="principal" href="#perfil" (click)="go($event, 'principal')">Marina Souza</a></h3>
        <p style="margin:0;height:40px">Limpeza · 2,3 km</p>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="nativo" type="button" (click)="hit('nativo')">Nativo</button>
          <a class="secundario" href="#avaliacoes" (click)="go($event, 'secundario')">Avaliações</a>
          <app-fav-emulated class="emulado" [pressed]="press('emulado')" />
          <app-fav-shadow class="sombra" tgCardAction [pressed]="press('sombra')" />
        </div>
      </tg-card>
    }
  `,
})
class StretchHostComponent {
  readonly appearances: TgCardAppearance[] = ['outlined', 'elevated', 'subtle'];
  readonly hits = signal<string[]>([]);
  hit(name: string) {
    this.hits.update((h) => [...h, name]);
  }
  press(name: string) {
    return () => this.hit(name);
  }
  go(event: Event, name: string) {
    event.preventDefault();
    this.hit(name);
  }
}

// Outras specs (ThemeService) deixam data-theme no <html>: cada teste do card
// fixa o modo e devolve o valor anterior ao terminar.
function pinTheme(theme: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

/** Clica onde o usuário clicaria: no elemento que está por cima naquele ponto. */
function clickAt(x: number, y: number) {
  let target = document.elementFromPoint(x, y) as HTMLElement | null;
  // Dentro de shadow DOM, desce até o elemento real.
  while (target?.shadowRoot) {
    const inner = target.shadowRoot.elementFromPoint(x, y) as HTMLElement | null;
    if (!inner || inner === target) break;
    target = inner;
  }
  target?.click();
  return target;
}

const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width / 2, r.top + r.height / 2] as const;
};

describe('TgCardLinkDirective: link esticado e ações secundárias', () => {
  let fixture: ComponentFixture<StretchHostComponent>;
  let host: StretchHostComponent;
  let restoreTheme: () => void;
  beforeEach(() => (restoreTheme = pinTheme()));
  afterEach(() => restoreTheme());

  beforeEach(async () => {
    fixture = TestBed.createComponent(StretchHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  for (const appearance of ['outlined', 'elevated', 'subtle']) {
    describe(appearance, () => {
      const card = () => fixture.nativeElement.querySelector(`#card-${appearance}`) as HTMLElement;
      const part = (selector: string) => card().querySelector(selector) as HTMLElement;
      const deep = (selector: string) => (part(selector).shadowRoot ?? part(selector)).querySelector('button')!;

      beforeEach(() => card().scrollIntoView({ block: 'center' }));

      it('área vazia e título abrem o link principal', () => {
        const r = card().getBoundingClientRect();
        clickAt(r.right - 6, r.top + 6);
        clickAt(...center(part('.principal')));
        expect(host.hits()).toEqual(['principal', 'principal']);
      });

      it('botão nativo, link secundário e botões encapsulados ficam por cima', () => {
        for (const selector of ['.nativo', '.secundario']) clickAt(...center(part(selector)));
        clickAt(...center(deep('.emulado')));
        clickAt(...center(deep('.sombra')));
        // Nenhuma ação secundária abriu o link principal.
        expect(host.hits()).toEqual(['nativo', 'secundario', 'emulado', 'sombra']);
      });

      it('teclado: todas as ações são focáveis; o anel do card só aparece com o título focado', () => {
        const actions = [part('.principal'), part('.nativo'), part('.secundario'), deep('.emulado'), deep('.sombra')];
        for (const action of actions) expect(action.tabIndex).toBe(0);

        part('.principal').focus();
        expect(getComputedStyle(card()).outlineStyle).toBe('solid');
        expect(getComputedStyle(part('.principal')).outlineStyle).toBe('none');

        part('.nativo').focus();
        expect(getComputedStyle(card()).outlineStyle).toBe('none');
        part('.nativo').blur();
      });
    });
  }
});

@Component({
  imports: [TgCardComponent],
  template: `
    <label tgCard id="radio-check"><input type="radio" name="g1" value="a" /> Reparos</label>
    <label tgCard id="radio-control" indicator="control"><input type="radio" name="g2" value="a" /> Casa</label>
    <label tgCard id="checkbox-check"><input type="checkbox" /> Limpeza</label>
    <label tgCard id="checkbox-control" indicator="control"><input type="checkbox" checked /> Beleza</label>
    <label tgCard id="aninhado" indicator="control">
      <span style="display:flex;gap:8px"><input type="checkbox" /> Trabalho</span>
    </label>
    <label tgCard id="desabilitado"><input type="radio" name="g3" disabled /> Bloqueado</label>
  `,
})
class FocusHostComponent {}

describe('TgCardComponent: foco nos cards de escolha', () => {
  let fixture: ComponentFixture<FocusHostComponent>;
  const card = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const control = (id: string) => card(id).querySelector('input') as HTMLInputElement;
  const rings = (id: string) =>
    [card(id), control(id)].filter((el) => getComputedStyle(el).outlineStyle !== 'none' && parseFloat(getComputedStyle(el).outlineWidth) > 0);

  beforeEach(async () => {
    fixture = TestBed.createComponent(FocusHostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  for (const theme of ['CUSTOMER', 'PROVIDER']) {
    for (const id of ['radio-check', 'radio-control', 'checkbox-check', 'checkbox-control', 'aninhado']) {
      it(`${theme} · ${id}: um anel só, no card, com a cor de foco`, () => {
        const restore = pinTheme(theme as 'CUSTOMER' | 'PROVIDER');
        try {
          control(id).focus();
          expect(control(id).matches(':focus-visible')).withContext('foco por teclado simulado').toBeTrue();
          expect(rings(id)).toEqual([card(id)]);
          const ring = getComputedStyle(card(id));
          expect(ring.outlineWidth).toBe('2px');
          const token = getComputedStyle(document.documentElement).getPropertyValue('--tg-focus-ring').trim();
          const probe = document.createElement('span');
          probe.style.color = token;
          document.body.appendChild(probe);
          expect(ring.outlineColor).toBe(getComputedStyle(probe).color);
          probe.remove();

          // Selecionado continua com o anel.
          control(id).click();
          expect(rings(id)).toEqual([card(id)]);
        } finally {
          control(id).blur();
          restore();
        }
      });
    }
  }

  it('selecionado no input aninhado também mostra a borda de selecionado', () => {
    control('aninhado').click();
    expect(getComputedStyle(card('aninhado')).borderTopWidth).toBe('2px');
  });

  it('controle desabilitado não recebe foco e fica fora do Tab', () => {
    control('desabilitado').focus();
    expect(document.activeElement).not.toBe(control('desabilitado'));
    expect(rings('desabilitado')).toEqual([]);
  });

  it('o input continua no Tab (tabIndex 0) nas duas variantes', () => {
    for (const id of ['radio-check', 'radio-control', 'checkbox-check', 'checkbox-control']) {
      expect(control(id).tabIndex).withContext(id).toBe(0);
    }
  });
});
