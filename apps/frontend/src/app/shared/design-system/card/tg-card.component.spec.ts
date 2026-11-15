import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter, RouterLink } from '@angular/router';
import { accessibleName } from '../button/accessible-name';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgCardComponent, TgCardLinkDirective } from './tg-card.component';

// Outras specs (ThemeService) deixam data-theme no <html>: cada teste do card
// fixa o modo e devolve o valor anterior ao terminar.
function pinTheme(theme: 'CUSTOMER' | 'PROVIDER' = 'CUSTOMER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

@Component({
  imports: [TgCardComponent, TgCardLinkDirective, TgButtonComponent, RouterLink, FormsModule],
  template: `
    <div style="width:320px">
      <tg-card id="contorno"><p>Limpeza residencial</p></tg-card>
      <tg-card id="elevado" appearance="elevated"><p>Destaque</p></tg-card>
      <tg-card id="suave" appearance="subtle" dense><p>Apoio</p></tg-card>

      <a tgCard id="link" routerLink="/categorias/limpeza"><h3>Limpeza</h3><p>128 profissionais</p></a>

      <tg-card id="prestador" appearance="elevated">
        <h3><a tgCardLink routerLink="/prestador/1">Marina Souza</a></h3>
        <p style="height:60px">Limpeza · 2,3 km</p>
        <button tgButton id="favoritar" type="button" appearance="ghost" iconStart="star" iconOnly
                aria-label="Favoritar Marina Souza" (click)="favoritos = favoritos + 1"></button>
      </tg-card>

      <div role="radiogroup" aria-label="Categoria">
        <label tgCard id="reparos">
          <input type="radio" name="categoria" value="reparos" [(ngModel)]="categoria" />
          <span>Reparos</span>
        </label>
        <label tgCard id="limpeza">
          <input type="radio" name="categoria" value="limpeza" [(ngModel)]="categoria" [disabled]="bloqueado()" />
          <span>Limpeza</span>
        </label>
      </div>

      <label tgCard id="casa" indicator="control">
        <input type="radio" name="endereco" value="casa" />
        <span>Casa</span>
      </label>
    </div>
  `,
})
class HostComponent {
  categoria = '';
  favoritos = 0;
  readonly bloqueado = signal(false);
}

describe('TgCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
  const style = (id: string) => getComputedStyle(el(id));
  const radio = (id: string) => el(id).querySelector('input') as HTMLInputElement;
  const check = (id: string) => el(id).querySelector('.tg-card__check') as HTMLElement | null;
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  let restoreTheme: () => void;
  beforeEach(() => (restoreTheme = pinTheme()));
  afterEach(() => restoreTheme());

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await render();
  });

  describe('aparências', () => {
    it('contorno é o padrão: borda, raio de 16 px, padding de 20 px e sem sombra', () => {
      expect(el('contorno').classList).toContain('tg-card--outlined');
      expect(style('contorno').borderTopStyle).toBe('solid');
      expect(style('contorno').borderTopWidth).toBe('1px');
      expect(style('contorno').borderTopLeftRadius).toBe('16px');
      expect(style('contorno').paddingTop).toBe('20px');
      expect(style('contorno').boxShadow).toBe('none');
    });

    it('elevado: sombra e borda transparente no modo cliente', () => {
      expect(style('elevado').boxShadow).not.toBe('none');
      expect(style('elevado').borderTopColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('elevado no prestador: sem sombra, com borda', () => {
      const restore = pinTheme('PROVIDER');
      try {
        expect(style('elevado').boxShadow).toBe('none');
        expect(style('elevado').borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
      } finally {
        restore();
      }
    });

    it('suave e denso: fundo suave, sem borda visível, padding de 16 px', () => {
      expect(style('suave').borderTopColor).toBe('rgba(0, 0, 0, 0)');
      expect(style('suave').backgroundColor).not.toBe(style('contorno').backgroundColor);
      expect(style('suave').paddingTop).toBe('16px');
    });

    it('o card não leva role', () => {
      for (const id of ['contorno', 'link', 'prestador', 'reparos']) expect(el(id).hasAttribute('role')).toBeFalse();
    });
  });

  describe('card inteiro como link', () => {
    it('é o próprio a nativo, com href e o conteúdo como nome', () => {
      const link = el('link') as HTMLAnchorElement;
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBe('/categorias/limpeza');
      expect(accessibleName(link)).toContain('Limpeza');
      expect(style('link').textDecorationLine).toBe('none');
      expect(style('link').cursor).toBe('pointer');
    });
  });

  describe('link esticado', () => {
    it('o nome do link é só o título', () => {
      const link = el('prestador').querySelector('a') as HTMLAnchorElement;
      expect(accessibleName(link)).toBe('Marina Souza');
      expect(link.getAttribute('href')).toBe('/prestador/1');
    });

    it('clicar fora do título cai no link; o botão continua por cima', () => {
      el('prestador').scrollIntoView({ block: 'center' });
      const card = el('prestador').getBoundingClientRect();
      const link = el('prestador').querySelector('a');
      // Canto inferior esquerdo, longe do título e do botão.
      expect(document.elementFromPoint(card.left + 4, card.bottom - 4)).toBe(link);

      const button = el('favoritar');
      const b = button.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      expect(button.contains(hit)).toBeTrue();
      button.click();
      expect(host.favoritos).toBe(1);
    });

    it('o card inteiro mostra o cursor de clique', () => {
      expect(style('prestador').cursor).toBe('pointer');
    });
  });

  describe('escolha com rádio nativo', () => {
    it('clicar no card marca o rádio e liga o ngModel', async () => {
      el('reparos').click();
      await render();
      expect(radio('reparos').checked).toBeTrue();
      expect(host.categoria).toBe('reparos');
    });

    it('o rádio tem o nome do card e continua focável', () => {
      expect(accessibleName(radio('reparos'))).toBe('Reparos');
      radio('reparos').focus();
      expect(document.activeElement).toBe(radio('reparos'));
      expect(radio('reparos').tabIndex).toBe(0);
    });

    it('selecionado: borda de 2 px na cor de ação, padding compensado e ✓ visível', async () => {
      expect(getComputedStyle(check('reparos')!).display).toBe('none');
      el('reparos').click();
      await render();
      expect(style('reparos').borderTopWidth).toBe('2px');
      expect(style('reparos').paddingTop).toBe('19px');
      expect(getComputedStyle(check('reparos')!).display).toBe('flex');
      expect(check('reparos')!.getAttribute('aria-hidden')).toBe('true');
      // O outro card volta ao normal.
      el('limpeza').click();
      await render();
      expect(style('reparos').borderTopWidth).toBe('1px');
      expect(getComputedStyle(check('reparos')!).display).toBe('none');
    });

    it('desabilitado: não marca, fundo suave, sem opacidade', async () => {
      host.bloqueado.set(true);
      await render();
      el('limpeza').click();
      await render();
      expect(radio('limpeza').checked).toBeFalse();
      expect(style('limpeza').opacity).toBe('1');
      expect(style('limpeza').cursor).toBe('not-allowed');
      expect(style('limpeza').backgroundColor).not.toBe(style('reparos').backgroundColor);
    });

    it('indicator="control": rádio visível e sem ✓', async () => {
      expect(check('casa')).toBeNull();
      expect(radio('casa').getBoundingClientRect().width).toBeGreaterThan(1);
      el('casa').click();
      await render();
      expect(radio('casa').checked).toBeTrue();
      expect(style('casa').borderTopWidth).toBe('2px');
    });
  });
});

@Component({
  imports: [TgCardComponent, TgCardLinkDirective],
  template: `
    <a tgCard id="com-botao" href="/x"><button type="button">Favoritar</button></a>
    <a tgCard id="com-link" href="/x"><span><a href="/y">Avaliações</a></span></a>
    <label tgCard id="sem-input">Sem input</label>
    <a tgCardLink href="/y">Fora do card</a>
    <tg-card><a tgCardLink href="/z">Certo</a></tg-card>
    <a tgCard href="/w">Só texto</a>
    <label tgCard><span><input type="checkbox" /> Certo, aninhado</span></label>
  `,
})
class MarkupHostComponent {}

@Component({
  imports: [TgCardComponent],
  template: `
    @if (show()) {
      <a tgCard id="dinamico" href="/x">
        <strong>Limpeza</strong>
        @if (button()) {
          <button type="button">Favoritar</button>
        }
        <span>{{ count() }} profissionais</span>
      </a>
      <label tgCard id="escolha">
        @if (radio()) {
          <input type="radio" name="c" />
        }
        Reparos
      </label>
    }
  `,
})
class DynamicMarkupHostComponent {
  readonly show = signal(true);
  readonly button = signal(false);
  readonly radio = signal(true);
  readonly count = signal(1);
}

describe('TgCardComponent: avisos em desenvolvimento', () => {
  let warn: jasmine.Spy;
  const messages = () => warn.calls.allArgs().map((args) => String(args[0]));
  const settle = async (fixture: ComponentFixture<unknown>) => {
    fixture.detectChanges();
    await fixture.whenStable();
    // O MutationObserver entrega numa microtarefa.
    await new Promise((resolve) => setTimeout(resolve));
  };

  beforeEach(() => (warn = spyOn(console, 'warn')));

  it('avisa uma vez por marcação inválida na primeira renderização', async () => {
    const fixture = TestBed.createComponent(MarkupHostComponent);
    await settle(fixture);
    const byElement = warn.calls.allArgs().map((args) => (args[1] as HTMLElement).id || args[1].textContent.trim());
    expect(byElement).toEqual(['com-botao', 'com-link', 'sem-input', 'Fora do card']);
    expect(messages()[0]).toContain('link não pode conter');
    expect(messages()[1]).toContain('link não pode conter');
    expect(messages()[2]).toContain('precisa de um input');
    expect(messages()[3]).toMatch(/^tgCardLink/);
  });

  describe('conteúdo dinâmico', () => {
    let fixture: ComponentFixture<DynamicMarkupHostComponent>;
    let host: DynamicMarkupHostComponent;

    beforeEach(async () => {
      fixture = TestBed.createComponent(DynamicMarkupHostComponent);
      host = fixture.componentInstance;
      await settle(fixture);
    });

    it('começa válido e sem aviso', () => {
      expect(warn).not.toHaveBeenCalled();
    });

    it('inserir um botão no link avisa; remover não; inserir de novo avisa de novo', async () => {
      host.button.set(true);
      await settle(fixture);
      expect(messages()).toEqual([jasmine.stringContaining('link não pode conter')]);

      host.button.set(false);
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);

      host.button.set(true);
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('mudanças que mantêm o estado inválido não repetem o aviso', async () => {
      host.button.set(true);
      await settle(fixture);
      host.count.set(2);
      await settle(fixture);
      host.count.set(3);
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('remover o rádio do label avisa; trocar o tipo do input também', async () => {
      host.radio.set(false);
      await settle(fixture);
      expect(messages()).toEqual([jasmine.stringContaining('precisa de um input')]);

      host.radio.set(true);
      await settle(fixture);
      const input = fixture.nativeElement.querySelector('#escolha input') as HTMLInputElement;
      input.type = 'text';
      await settle(fixture);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('destruído: o observer é desligado', async () => {
      const disconnect = spyOn(MutationObserver.prototype, 'disconnect').and.callThrough();
      const link = fixture.nativeElement.querySelector('#dinamico') as HTMLElement;
      host.show.set(false);
      await settle(fixture);
      expect(disconnect).toHaveBeenCalledTimes(2);
      link.appendChild(document.createElement('button'));
      await settle(fixture);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  it('em produção não confere nem observa', async () => {
    const observe = spyOn(MutationObserver.prototype, 'observe').and.callThrough();
    const global = globalThis as { ngDevMode?: unknown };
    const previous = global.ngDevMode;
    global.ngDevMode = false;
    try {
      const fixture = TestBed.createComponent(MarkupHostComponent);
      await settle(fixture);
    } finally {
      global.ngDevMode = previous;
    }
    expect(warn).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
  });
});
