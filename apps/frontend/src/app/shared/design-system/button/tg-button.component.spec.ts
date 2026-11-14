import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TgButtonComponent, type TgButtonAppearance } from './tg-button.component';

@Component({
  imports: [TgButtonComponent],
  template: `
    <button
      id="principal"
      tgButton
      type="button"
      [appearance]="appearance()"
      [loading]="loading()"
      [iconStart]="iconStart()"
      (click)="clicks = clicks + 1"
    >
      Solicitar
    </button>
    <button id="nativo" tgButton type="button" disabled (click)="clicks = clicks + 1">Nativo</button>
    <button id="semantico" tgButton type="button" [attr.aria-disabled]="ariaDisabled()" (click)="clicks = clicks + 1">
      Semântico
    </button>
    <a id="link" tgButton href="#tg-link" (click)="clicks = clicks + 1">Link</a>
    <a id="link-off" tgButton href="#tg-link-off" aria-disabled="true" [loading]="loading()" (click)="clicks = clicks + 1">
      Link indisponível
    </a>
  `,
})
class HostComponent {
  readonly appearance = signal<TgButtonAppearance>('solid');
  readonly loading = signal(false);
  readonly iconStart = signal<'arrow-right' | undefined>(undefined);
  readonly ariaDisabled = signal<'true' | 'false' | null>('true');
  clicks = 0;
}

/**
 * Nome acessível como o navegador calcula para um botão (accname 1.2), no
 * subconjunto que o tgButton usa: aria-labelledby, depois aria-label, depois
 * o conteúdo, sem nós escondidos (aria-hidden, hidden, display:none,
 * visibility:hidden). Basta para pegar o bug original: o conteúdo com
 * visibility:hidden saía do nome e sobrava só "Carregando".
 */
function accessibleName(el: HTMLElement): string {
  const ids = el.getAttribute('aria-labelledby')?.trim().split(/\s+/).filter(Boolean) ?? [];
  const fromRefs = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
  return normalize(fromRefs) || normalize(el.getAttribute('aria-label') ?? '') || normalize(contentOf(el));
}

const contentOf = (el: Element) => Array.from(el.childNodes).map(nameFromContent).join(' ');

function nameFromContent(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof HTMLElement || node instanceof SVGElement)) return '';
  if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return '';
  const style = getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return '';
  return node.getAttribute('aria-label') ?? contentOf(node);
}

/** Descrição: texto de aria-describedby, que inclui alvos escondidos. */
function accessibleDescription(el: HTMLElement): string {
  const ids = el.getAttribute('aria-describedby')?.trim().split(/\s+/).filter(Boolean) ?? [];
  return normalize(ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
}

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

@Component({
  imports: [TgButtonComponent],
  template: `
    <span id="rotulo-fechar">{{ refText() }}</span>
    <span id="rotulo-vazio">   </span>
    <button
      tgButton
      type="button"
      iconStart="x"
      [iconOnly]="iconOnly()"
      [loading]="loading()"
      [attr.aria-label]="label()"
      [attr.aria-labelledby]="labelledBy()"
      aria-describedby="dica"
    >
      Fechar
    </button>
    <span id="dica">Fecha sem salvar</span>
  `,
})
class IconOnlyHostComponent {
  readonly iconOnly = signal(true);
  readonly loading = signal(false);
  readonly label = signal<string | null>(null);
  readonly labelledBy = signal<string | null>(null);
  readonly refText = signal('Fechar janela');
}

describe('TgButtonComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;
  let button: HTMLButtonElement;

  // Um link com click não cancelado navegaria e tiraria o Karma da página.
  // Para o link habilitado, este listener no documento registra se a
  // navegação teria acontecido e então a cancela.
  let navigationAllowed: boolean | undefined;
  const recordNavigation = (event: Event) => {
    navigationAllowed = !event.defaultPrevented;
    event.preventDefault();
  };

  /** Click de ativação; o retorno diz se o navegador seguiria com a ação. */
  const activate = (target: HTMLElement) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  const query = <T extends HTMLElement>(id: string) => el.querySelector(`#${id}`) as T;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement;
    button = query('principal');
    navigationAllowed = undefined;
    document.addEventListener('click', recordNavigation);
  });

  afterEach(() => document.removeEventListener('click', recordNavigation));

  it('continua sendo um button nativo, com o texto projetado', () => {
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent?.trim()).toBe('Solicitar');
    expect(button.classList).toContain('tg-button--solid');
    expect(button.classList).toContain('tg-button--md');
  });

  it('troca a classe de aparência', () => {
    host.appearance.set('outline');
    fixture.detectChanges();
    expect(button.classList).toContain('tg-button--outline');
    expect(button.classList).not.toContain('tg-button--solid');
  });

  describe('habilitado', () => {
    it('button executa o handler', () => {
      button.click();
      expect(host.clicks).toBe(1);
    });

    it('link executa o handler e navega normalmente', () => {
      query<HTMLAnchorElement>('link').click();
      expect(host.clicks).toBe(1);
      expect(navigationAllowed).toBeTrue();
    });
  });

  describe('disabled nativo', () => {
    it('fica com o comportamento do navegador: sem clique e sem aria-disabled extra', () => {
      const nativo = query<HTMLButtonElement>('nativo');
      nativo.click();
      expect(host.clicks).toBe(0);
      expect(nativo.disabled).toBeTrue();
      expect(nativo.hasAttribute('aria-disabled')).toBeFalse();
    });
  });

  describe('aria-disabled="true" posto pela tela', () => {
    it('button não executa o handler', () => {
      query<HTMLButtonElement>('semantico').click();
      expect(host.clicks).toBe(0);
    });

    it('link não navega nem executa o handler', () => {
      const event = activate(query<HTMLAnchorElement>('link-off'));
      expect(host.clicks).toBe(0);
      expect(event.defaultPrevented).toBeTrue();
    });

    it('mantém o atributo, o foco e a ordem de Tab', () => {
      const semantico = query<HTMLButtonElement>('semantico');
      expect(semantico.getAttribute('aria-disabled')).toBe('true');
      expect(semantico.disabled).toBeFalse();
      expect(semantico.tabIndex).toBe(0);

      semantico.focus();
      expect(document.activeElement).toBe(semantico);
    });

    it('não cancela teclas: Tab, Enter e Espaço seguem para o navegador', () => {
      const semantico = query<HTMLButtonElement>('semantico');
      for (const key of ['Tab', 'Enter', ' ']) {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
        semantico.dispatchEvent(event);
        expect(event.defaultPrevented).withContext(key).toBeFalse();
      }
    });

    it('Enter e Espaço ativam pelo click, que é bloqueado', () => {
      // O navegador traduz Enter (button e link) e Espaço (button) num click
      // na ativação; eventos sintéticos de teclado não fazem isso, então o
      // teste reproduz o click que a ativação dispararia.
      const semantico = query<HTMLButtonElement>('semantico');
      const activation = activate(semantico);
      expect(activation.defaultPrevented).toBeTrue();
      expect(host.clicks).toBe(0);
    });

    it('volta a funcionar quando a tela tira o aria-disabled', () => {
      const semantico = query<HTMLButtonElement>('semantico');
      host.ariaDisabled.set('false');
      fixture.detectChanges();
      semantico.click();

      host.ariaDisabled.set(null);
      fixture.detectChanges();
      semantico.click();

      expect(host.clicks).toBe(2);
    });
  });

  describe('carregando', () => {
    it('bloqueia o clique, mantém o foco e anuncia', () => {
      host.loading.set(true);
      fixture.detectChanges();

      button.focus();
      button.click();

      expect(host.clicks).toBe(0);
      expect(document.activeElement).toBe(button);
      expect(button.disabled).toBeFalse();
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.getAttribute('aria-disabled')).toBe('true');
      expect(button.textContent).toContain('Carregando');
    });

    it('ao terminar, volta a aceitar clique e remove o aria-disabled que ele mesmo colocou', () => {
      host.loading.set(true);
      fixture.detectChanges();
      host.loading.set(false);
      fixture.detectChanges();

      button.click();

      expect(host.clicks).toBe(1);
      expect(button.hasAttribute('aria-disabled')).toBeFalse();
      expect(button.hasAttribute('aria-busy')).toBeFalse();
    });

    it('ao terminar, preserva o aria-disabled da tela e o link continua bloqueado', () => {
      const linkOff = query<HTMLAnchorElement>('link-off');
      host.loading.set(true);
      fixture.detectChanges();
      host.loading.set(false);
      fixture.detectChanges();

      const event = activate(linkOff);

      expect(linkOff.getAttribute('aria-disabled')).toBe('true');
      expect(host.clicks).toBe(0);
      expect(event.defaultPrevented).toBeTrue();
    });
  });

  describe('nome acessível durante o carregamento', () => {
    it('botão com texto mantém o nome antes, durante e depois', () => {
      expect(accessibleName(button)).toBe('Solicitar');

      host.loading.set(true);
      fixture.detectChanges();
      expect(accessibleName(button)).toBe('Solicitar');

      host.loading.set(false);
      fixture.detectChanges();
      expect(accessibleName(button)).toBe('Solicitar');
    });

    it('comunica o estado à parte, sem duplicar o nome', () => {
      host.loading.set(true);
      fixture.detectChanges();

      expect(accessibleName(button)).not.toContain('Carregando');
      expect(accessibleDescription(button)).toBe('Carregando');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.getAttribute('aria-disabled')).toBe('true');
      const spinner = button.querySelector('.tg-button__spinner');
      expect(spinner?.getAttribute('aria-hidden')).toBe('true');

      host.loading.set(false);
      fixture.detectChanges();
      expect(button.hasAttribute('aria-describedby')).toBeFalse();
      expect(button.querySelector('.tg-button__spinner')).toBeNull();
    });

    it('spinner presente; gira por padrão e para com movimento reduzido', () => {
      host.loading.set(true);
      fixture.detectChanges();
      const spinner = button.querySelector('.tg-button__spinner') as HTMLElement;
      expect(spinner).not.toBeNull();

      // O Chrome headless do CI não pede movimento reduzido: vale a animação.
      expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBeFalse();
      const style = getComputedStyle(spinner);
      expect(style.animationName).toContain('tg-button-spin');
      expect(style.animationIterationCount).toBe('infinite');

      // O Karma não emula a media query; conferimos a regra carregada.
      const reduced = Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule)
        .filter((rule) => rule.conditionText.includes('prefers-reduced-motion: reduce'))
        .flatMap((rule) => Array.from(rule.cssRules) as CSSStyleRule[])
        .find((rule) => rule.selectorText?.includes('tg-button__spinner'));
      expect(reduced?.style.animationName).toBe('none');
    });
  });

  describe('iconOnly', () => {
    let iconFixture: ComponentFixture<IconOnlyHostComponent>;
    let iconHost: IconOnlyHostComponent;
    let iconButton: HTMLButtonElement;
    let warn: jasmine.Spy;

    // A validação reage a atributos por MutationObserver (assíncrono).
    const settle = async () => {
      iconFixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve));
    };
    const warnings = () => warn.calls.allArgs().filter(([message]) => String(message).startsWith('tgButton')).length;

    beforeEach(async () => {
      warn = spyOn(console, 'warn');
      iconFixture = TestBed.createComponent(IconOnlyHostComponent);
      iconHost = iconFixture.componentInstance;
    });

    const start = async (setup: () => void = () => undefined) => {
      setup();
      await settle();
      iconButton = iconFixture.nativeElement.querySelector('button');
    };

    it('iconOnly=false não exige nome além do texto', async () => {
      await start(() => iconHost.iconOnly.set(false));
      expect(warnings()).toBe(0);
    });

    it('aceita aria-label', async () => {
      await start(() => iconHost.label.set('Fechar'));
      expect(warnings()).toBe(0);
      expect(accessibleName(iconButton)).toBe('Fechar');
    });

    it('aceita aria-labelledby que aponta para texto', async () => {
      await start(() => iconHost.labelledBy.set('rotulo-fechar'));
      expect(warnings()).toBe(0);
      expect(accessibleName(iconButton)).toBe('Fechar janela');
    });

    it('avisa sem nome acessível', async () => {
      await start();
      expect(warnings()).toBe(1);
      expect(accessibleName(iconButton)).toBe('');
    });

    for (const [caso, setup] of [
      ['aria-label vazio', (h: IconOnlyHostComponent) => h.label.set('')],
      ['aria-label só com espaços', (h: IconOnlyHostComponent) => h.label.set('   ')],
      ['aria-labelledby para id inexistente', (h: IconOnlyHostComponent) => h.labelledBy.set('nao-existe')],
      ['aria-labelledby para texto vazio', (h: IconOnlyHostComponent) => h.labelledBy.set('rotulo-vazio')],
    ] as const) {
      it(`avisa com ${caso}`, async () => {
        await start(() => setup(iconHost));
        expect(warnings()).toBe(1);
      });
    }

    it('valida quando iconOnly passa de false para true', async () => {
      await start(() => iconHost.iconOnly.set(false));
      expect(warnings()).toBe(0);

      iconHost.iconOnly.set(true);
      await settle();
      expect(warnings()).toBe(1);
    });

    it('para de avisar com nome, volta a avisar sem ele, e não repete', async () => {
      await start();
      expect(warnings()).toBe(1);

      iconHost.label.set('Fechar');
      await settle();
      iconHost.loading.set(true); // outra mudança qualquer no mesmo estado válido
      await settle();
      expect(warnings()).toBe(1);

      iconHost.label.set(null);
      await settle();
      expect(warnings()).toBe(2);

      iconHost.loading.set(false); // estado inválido inalterado
      await settle();
      iconHost.refText.set('Outro texto');
      await settle();
      expect(warnings()).toBe(2);
    });

    it('mantém o nome e a descrição da tela durante o carregamento', async () => {
      await start(() => iconHost.label.set('Fechar'));
      iconButton.focus();

      iconHost.loading.set(true);
      await settle();
      expect(accessibleName(iconButton)).toBe('Fechar');
      expect(accessibleDescription(iconButton)).toBe('Fecha sem salvar Carregando');
      expect(document.activeElement).toBe(iconButton);

      iconHost.loading.set(false);
      await settle();
      expect(accessibleName(iconButton)).toBe('Fechar');
      expect(iconButton.getAttribute('aria-describedby')).toBe('dica');
    });
  });

  it('renderiza o ícone como decorativo', () => {
    host.iconStart.set('arrow-right');
    fixture.detectChanges();
    const svg = button.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
