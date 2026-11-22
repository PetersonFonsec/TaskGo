import { Component, isDevMode, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgEmptyStateComponent } from './tg-empty-state.component';

function pinTheme(theme: 'CUSTOMER' | 'PROVIDER') {
  const root = document.documentElement;
  const previous = root.getAttribute('data-theme');
  root.setAttribute('data-theme', theme);
  return () => (previous === null ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', previous));
}

const rect = (el: Element) => el.getBoundingClientRect();
/** A ação está na mesma linha do texto, à direita dele. */
const actionBeside = (host: HTMLElement) => {
  const body = rect(host.querySelector('.tg-empty-state__body') as HTMLElement);
  const action = rect(host.querySelector('[tgEmptyAction]') as HTMLElement);
  return action.left >= body.right - 1 && action.top < body.bottom;
};
/** A ação desceu para baixo do texto e começa onde o texto começa. */
const actionBelowAligned = (host: HTMLElement) => {
  const body = rect(host.querySelector('.tg-empty-state__body') as HTMLElement);
  const action = rect(host.querySelector('[tgEmptyAction]') as HTMLElement);
  return action.top >= body.bottom - 1 && Math.abs(action.left - body.left) <= 1;
};
/** Nada do componente passa da largura dele. */
const noOverflow = (host: HTMLElement) => {
  const box = rect(host);
  return Array.from(host.querySelectorAll<HTMLElement>('*')).every((el) => {
    const r = rect(el);
    return r.width === 0 || (r.left >= box.left - 0.5 && r.right <= box.right + 0.5);
  });
};

@Component({
  imports: [TgEmptyStateComponent, TgButtonComponent],
  template: `
    <div [style.width.px]="width()">
      <tg-empty-state id="alvo" compact [icon]="withIcon() ? 'map-pin' : undefined" [title]="title()">
        {{ text() }}
        @if (withAction()) {
          <button tgButton tgEmptyAction appearance="outline" size="sm">{{ actionLabel() }}</button>
        }
      </tg-empty-state>
    </div>
  `,
})
class CompactHost {
  readonly width = signal(560);
  readonly withIcon = signal(true);
  readonly withAction = signal(true);
  readonly title = signal('Nenhum endereço cadastrado');
  readonly text = signal('Adicione um endereço para contratar perto de você.');
  readonly actionLabel = signal('Adicionar');
}

describe('tg-empty-state compacto: layout pelo contêiner', () => {
  let fixture: ComponentFixture<CompactHost>;
  const host = () => fixture.nativeElement.querySelector('#alvo') as HTMLElement;
  const set = (patch: Partial<Record<keyof CompactHost, unknown>>) => {
    for (const [key, value] of Object.entries(patch)) (fixture.componentInstance as any)[key].set(value);
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(CompactHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  it('o teste roda numa tela larga (o problema é o contêiner, não a viewport)', () => {
    expect(window.innerWidth).toBeGreaterThanOrEqual(600);
  });

  it('contêiner de 560 px: ação à direita, sem overflow', () => {
    expect(actionBeside(host())).toBeTrue();
    expect(noOverflow(host())).toBeTrue();
  });

  it('contêiner de 280 px numa tela larga: ação desce, alinhada ao texto, sem overflow', () => {
    set({ width: 280 });
    expect(actionBelowAligned(host())).toBeTrue();
    expect(noOverflow(host())).toBeTrue();
    expect(rect(host().querySelector('.tg-empty-state__body') as HTMLElement).width).toBeGreaterThan(150);
  });

  it('sem ícone, em 280 px: a ação desce alinhada ao texto (sem recuo do ícone)', () => {
    set({ width: 280, withIcon: false });
    expect(actionBelowAligned(host())).toBeTrue();
    expect(noOverflow(host())).toBeTrue();
  });

  it('círculo de 44 px e ícone de 22 px nos dois tamanhos de contêiner', () => {
    for (const width of [560, 280]) {
      set({ width });
      expect(rect(host().querySelector('.tg-empty-state__icon') as HTMLElement).width).toBe(44);
      expect(rect(host().querySelector('.tg-empty-state__icon svg') as Element).width).toBe(22);
    }
  });

  it('textos longos e palavra sem espaço quebram sem overflow', () => {
    set({
      width: 280,
      title: 'Nenhumendereçocadastradoparaestacontaporenquanto',
      text: 'Adicione um endereço completo, com número e complemento, para contratar profissionais perto de você.',
    });
    expect(noOverflow(host())).toBeTrue();
    expect(rect(host().querySelector('.tg-empty-state__title') as HTMLElement).height).toBeGreaterThan(30);
  });

  it('botão com texto longo em 280 px: quebra sem overflow e mantém 32 px de altura mínima', () => {
    set({ width: 280, actionLabel: 'Adicionar endereço de entrega principal' });
    const button = host().querySelector('[tgEmptyAction]') as HTMLElement;
    expect(noOverflow(host())).toBeTrue();
    expect(rect(button).height).toBeGreaterThanOrEqual(32);
  });

  it('sem ação: o texto ocupa a largura e não sobra espaço para a ação', () => {
    set({ withAction: false });
    const action = host().querySelector('.tg-empty-state__action') as HTMLElement;
    expect(rect(action).width).toBe(0);
    expect(rect(action).height).toBe(0);
  });

  it('nos dois modos, o layout é o mesmo', () => {
    for (const theme of ['CUSTOMER', 'PROVIDER'] as const) {
      const restore = pinTheme(theme);
      try {
        set({ width: 280 });
        expect(actionBelowAligned(host())).withContext(theme).toBeTrue();
        set({ width: 560 });
        expect(actionBeside(host())).withContext(theme).toBeTrue();
      } finally {
        restore();
      }
    }
  });
});

/** Com preserveWhitespaces, os espaços e quebras de linha viram nós de texto. */
@Component({
  selector: 'tg-whitespace-host',
  imports: [TgEmptyStateComponent],
  template: `<tg-empty-state id="espacos" title="Nada por aqui">

    </tg-empty-state>`,
  preserveWhitespaces: true,
})
class WhitespaceHost {}

@Component({
  imports: [TgEmptyStateComponent, TgButtonComponent, WhitespaceHost],
  template: `
    <div style="width: 560px">
      <tg-empty-state id="vazio" title="Nada por aqui" />
      <tg-empty-state id="se" title="Nada por aqui">
        @if (text()) {
          {{ text() }}
        }
        @if (action()) {
          <button tgButton tgEmptyAction>Buscar profissionais</button>
        }
      </tg-empty-state>
      <tg-empty-state id="interpolado" title="Nada por aqui">{{ blank() }}</tg-empty-state>
      <tg-whitespace-host />
    </div>
  `,
})
class SlotsHost {
  readonly text = signal('');
  readonly action = signal(false);
  readonly blank = signal('');
}

describe('tg-empty-state: slots vazios não deixam espaço', () => {
  let fixture: ComponentFixture<SlotsHost>;
  const $ = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  /** Altura ocupada abaixo do título: título até o fim do conteúdo do componente. */
  const below = (id: string) => {
    const box = $(`#${id} .tg-empty-state__box`);
    const title = rect(box.querySelector('.tg-empty-state__title') as HTMLElement);
    return rect(box).bottom - parseFloat(getComputedStyle(box).paddingBottom) - title.bottom;
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(SlotsHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  for (const id of ['vazio', 'espacos', 'se', 'interpolado']) {
    it(`${id}: nada abaixo do título`, () => {
      expect(below(id)).toBeLessThanOrEqual(0.5);
    });
  }

  it('conteúdo condicional entra e sai, e o espaço acompanha', () => {
    fixture.componentInstance.text.set('Tente outra região.');
    fixture.componentInstance.action.set(true);
    fixture.detectChanges();
    expect(below('se')).toBeGreaterThan(40);
    expect($('#se .tg-empty-state__text').textContent?.trim()).toBe('Tente outra região.');
    expect($('#se .tg-empty-state__action [tgEmptyAction]')).not.toBeNull();
    fixture.componentInstance.text.set('');
    fixture.componentInstance.action.set(false);
    fixture.detectChanges();
    expect(below('se')).toBeLessThanOrEqual(0.5);
  });
});

@Component({
  imports: [TgEmptyStateComponent, TgButtonComponent],
  template: `
    <tg-empty-state title="Nenhum item">
      @if (first()) {
        <button tgButton tgEmptyAction>Adicionar</button>
      }
      @if (second()) {
        <button tgButton tgEmptyAction>Importar</button>
      }
      @if (third()) {
        <button tgButton tgEmptyAction>Ver ajuda</button>
      }
    </tg-empty-state>
  `,
})
class ActionsHost {
  readonly first = signal(false);
  readonly second = signal(false);
  readonly third = signal(false);
}

describe('tg-empty-state: até duas ações', () => {
  let fixture: ComponentFixture<ActionsHost>;
  let warn: jasmine.Spy;
  const render = (first: boolean, second: boolean, third = false) => {
    fixture.componentInstance.first.set(first);
    fixture.componentInstance.second.set(second);
    fixture.componentInstance.third.set(third);
    fixture.detectChanges();
  };
  const warnings = () => warn.calls.allArgs().filter((a) => String(a[0]).includes('tg-empty-state'));

  beforeEach(() => {
    warn = spyOn(console, 'warn');
    fixture = TestBed.createComponent(ActionsHost);
    fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('sem ação e com uma ação: sem aviso', () => {
    render(false, false);
    render(true, false);
    expect(warnings().length).toBe(0);
  });

  it('duas ações: sem aviso e sem esconder nenhuma', () => {
    render(true, true);
    expect(warnings().length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('[tgEmptyAction]').length).toBe(2);
  });

  it('três ações: avisa em desenvolvimento e mantém todas visíveis', () => {
    expect(isDevMode()).toBeTrue();
    render(true, true, true);
    expect(warnings().length).toBe(1);
    expect(String(warnings()[0][0])).toContain('no máximo duas ações');
    expect(fixture.nativeElement.querySelectorAll('[tgEmptyAction]').length).toBe(3);
  });

  it('ao passar de duas ações avisa de novo depois que uma violação termina', () => {
    render(true, true);
    expect(warnings().length).toBe(0);
    render(true, true, true);
    expect(warnings().length).toBe(1);
    render(true, true);
    expect(warnings().length).toBe(1);
    render(true, true, true);
    expect(warnings().length).toBe(2);
  });
});

@Component({
  imports: [TgEmptyStateComponent, TgButtonComponent],
  template: `
    <button id="antes">Antes</button>
    <tg-empty-state id="nivel" title="Nada por aqui" [level]="$any(level())">
      <button tgButton tgEmptyAction id="acao">Buscar</button>
    </tg-empty-state>
  `,
})
class LevelHost {
  readonly level = signal<unknown>(2);
}

describe('tg-empty-state: level e teclado', () => {
  let fixture: ComponentFixture<LevelHost>;
  const heading = () => (fixture.nativeElement.querySelector('#nivel .tg-empty-state__title') as HTMLElement).tagName;

  beforeEach(() => {
    fixture = TestBed.createComponent(LevelHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });
  afterEach(() => fixture.nativeElement.remove());

  const cases: [unknown, string][] = [
    [2, 'H2'], [3, 'H3'], [4, 'H4'], [5, 'H5'], [6, 'H6'], ['3', 'H3'],
    [3.9, 'H2'], ['3.9', 'H2'], [1, 'H2'], [7, 'H2'], [NaN, 'H2'], [Infinity, 'H2'], ['abc', 'H2'], ['', 'H2'],
  ];
  for (const [input, tag] of cases) {
    it(`level=${JSON.stringify(input) ?? String(input)} → ${tag}`, () => {
      fixture.componentInstance.level.set(input);
      fixture.detectChanges();
      expect(heading()).toBe(tag);
    });
  }

  it('troca dinâmica de level mantém um heading só, com o mesmo texto', () => {
    for (const level of [4, 2, 6]) {
      fixture.componentInstance.level.set(level);
      fixture.detectChanges();
      const titles = fixture.nativeElement.querySelectorAll('#nivel h2, #nivel h3, #nivel h4, #nivel h5, #nivel h6');
      expect(titles.length).toBe(1);
      expect(titles[0].textContent.trim()).toBe('Nada por aqui');
    }
  });

  it('não move o foco e a ação é o único ponto de Tab, na ordem do documento', () => {
    const antes = fixture.nativeElement.querySelector('#antes') as HTMLButtonElement;
    antes.focus();
    fixture.componentInstance.level.set(3);
    fixture.detectChanges();
    expect(document.activeElement).toBe(antes);
    const host = fixture.nativeElement.querySelector('#nivel') as HTMLElement;
    const focusables = host.querySelectorAll('a[href], button, input, select, textarea, [tabindex]');
    expect(focusables.length).toBe(1);
    expect(focusables[0].id).toBe('acao');
    expect(antes.compareDocumentPosition(focusables[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
