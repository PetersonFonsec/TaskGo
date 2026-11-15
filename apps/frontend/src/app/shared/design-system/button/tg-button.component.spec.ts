import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { accessibleName, idRefs } from './accessible-name';
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

/** Descrição: texto de aria-describedby, que inclui alvos escondidos. */
function accessibleDescription(el: HTMLElement): string {
  return normalize(idRefs(el.getAttribute('aria-describedby')).map((id) => document.getElementById(id)?.textContent ?? '').join(' '));
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

/** A tela controla aria-disabled e aria-describedby por binding. */
@Component({
  imports: [TgButtonComponent],
  template: `
    <span id="d1">Taxa de R$ 5</span>
    <span id="d2">Leva 2 minutos</span>
    <span id="d3">Novo horário</span>
    <button
      tgButton
      type="button"
      [loading]="loading()"
      [attr.aria-disabled]="ariaDisabled()"
      [attr.aria-describedby]="describedBy()"
      (click)="clicks = clicks + 1"
    >
      Solicitar serviço
    </button>
    <a tgButton href="#tg-pedido" [loading]="loading()" [attr.aria-disabled]="linkDisabled()" (click)="clicks = clicks + 1">
      Ver pedido
    </a>
  `,
})
class ScreenStateHostComponent {
  readonly loading = signal(false);
  readonly ariaDisabled = signal<'true' | 'false' | null>(null);
  readonly linkDisabled = signal<'true' | null>('true');
  readonly describedBy = signal<string | null>(null);
  clicks = 0;
}

/** Botão só de ícone cujo template cada caso de nome define. */
@Component({ imports: [TgButtonComponent], template: '' })
class NameCaseHostComponent {}

/** Inputs booleanos na sintaxe de atributo HTML e por binding. */
@Component({
  imports: [TgButtonComponent],
  template: `
    <button id="icon-attr" tgButton iconStart="x" iconOnly aria-label="Fechar">Texto escondido</button>
    <button id="icon-true" tgButton iconStart="x" [iconOnly]="true" aria-label="Fechar"></button>
    <button id="icon-false" tgButton [iconOnly]="false">Continuar</button>
    <button id="icon-str-false" tgButton iconOnly="false">Continuar</button>
    <button id="icon-none" tgButton>Continuar</button>
    <button id="loading-attr" tgButton loading (click)="clicks = clicks + 1">Salvando</button>
    <button id="loading-bind" tgButton [loading]="isLoading()" (click)="clicks = clicks + 1">Salvar</button>
    <button id="full-attr" tgButton fullWidth>Continuar</button>
    <button id="full-bind" tgButton [fullWidth]="full()">Continuar</button>
    <button
      id="docs"
      tgButton
      appearance="ghost"
      iconStart="x"
      iconOnly
      aria-label="Fechar"
    ></button>
  `,
})
class BooleanAttributesHostComponent {
  readonly isLoading = signal(false);
  readonly full = signal(false);
  clicks = 0;
}

/** aria-labelledby cujo texto muda depois da primeira verificação. */
@Component({
  imports: [TgButtonComponent],
  template: `
    <span id="rotulo-a">{{ label() }}</span>
    <span id="rotulo-b">{{ other() }}</span>
    <span id="rotulo-oculto" hidden>{{ label() }}</span>
    @if (show()) {
      <button tgButton iconOnly iconStart="x" [attr.aria-labelledby]="labelledBy()"></button>
    }
  `,
})
class LabelledByTextHostComponent {
  readonly label = signal('Fechar');
  readonly other = signal('');
  readonly labelledBy = signal('rotulo-a');
  readonly show = signal(true);
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

  describe('estado da tela durante o carregamento', () => {
    let screenFixture: ComponentFixture<ScreenStateHostComponent>;
    let screen: ScreenStateHostComponent;
    let btn: HTMLButtonElement;
    let link: HTMLAnchorElement;

    // A tela muda atributos por binding; o componente acompanha por
    // MutationObserver, que entrega os registros numa microtarefa.
    const render = async () => {
      screenFixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve));
    };
    const loading = async (value: boolean) => {
      screen.loading.set(value);
      await render();
    };
    const describedIds = () => idRefs(btn.getAttribute('aria-describedby'));
    const ownIds = () => describedIds().filter((id) => id.startsWith('tg-button-status-'));

    beforeEach(async () => {
      screenFixture = TestBed.createComponent(ScreenStateHostComponent);
      screen = screenFixture.componentInstance;
      await render();
      btn = screenFixture.nativeElement.querySelector('button');
      link = screenFixture.nativeElement.querySelector('a');
    });

    describe('aria-disabled', () => {
      for (const [inicial, esperado] of [
        [null, null],
        ['false', 'false'],
        ['true', 'true'],
      ] as const) {
        it(`${inicial ?? 'ausente'} antes: "true" no carregamento e ${esperado ?? 'ausente'} depois`, async () => {
          screen.ariaDisabled.set(inicial);
          await render();

          await loading(true);
          expect(btn.getAttribute('aria-disabled')).toBe('true');

          await loading(false);
          expect(btn.getAttribute('aria-disabled')).toBe(esperado);
        });
      }

      it('a tela torna indisponível durante o carregamento: continua indisponível depois', async () => {
        screen.ariaDisabled.set('false');
        await render();
        await loading(true);

        screen.ariaDisabled.set('true');
        await render();
        await loading(false);

        expect(btn.getAttribute('aria-disabled')).toBe('true');
        btn.click();
        expect(screen.clicks).toBe(0);
      });

      it('a tela libera durante o carregamento: volta a funcionar depois', async () => {
        screen.ariaDisabled.set('true');
        await render();
        await loading(true);

        screen.ariaDisabled.set(null);
        await render();
        expect(btn.getAttribute('aria-disabled')).toBe('true'); // ainda carregando
        btn.click();
        expect(screen.clicks).toBe(0);

        await loading(false);
        expect(btn.hasAttribute('aria-disabled')).toBeFalse();
        btn.click();
        expect(screen.clicks).toBe(1);
      });

      it('mudança da tela e fim do carregamento no mesmo ciclo', async () => {
        await loading(true);
        screen.ariaDisabled.set('true');
        screen.loading.set(false);
        await render();
        expect(btn.getAttribute('aria-disabled')).toBe('true');
      });

      it('mudança direta no DOM pela tela também vale', async () => {
        await loading(true);
        btn.setAttribute('aria-disabled', 'true');
        await loading(false);
        expect(btn.getAttribute('aria-disabled')).toBe('true');
      });

      it('carregamento ligado e desligado várias vezes, com mudanças no meio', async () => {
        const sequence: Array<'true' | 'false' | null> = ['true', null, 'false', 'true', null];
        for (const value of sequence) {
          await loading(true);
          screen.ariaDisabled.set(value);
          await render();
          expect(btn.getAttribute('aria-disabled')).toBe('true');
          await loading(false);
          expect(btn.getAttribute('aria-disabled')).toBe(value);
        }
        expect(describedIds()).toEqual([]);
      });

      it('link indisponível não navega nem chama o handler em nenhuma fase', async () => {
        const activate = () => {
          const event = new MouseEvent('click', { bubbles: true, cancelable: true });
          link.dispatchEvent(event);
          return event.defaultPrevented;
        };
        expect(activate()).toBeTrue();
        await loading(true);
        expect(activate()).toBeTrue();
        await loading(false);
        expect(activate()).toBeTrue();
        expect(link.getAttribute('aria-disabled')).toBe('true');
        expect(screen.clicks).toBe(0);
      });

      it('mantém foco e nome em todas as fases', async () => {
        btn.focus();
        await loading(true);
        screen.ariaDisabled.set('true');
        await render();
        expect(document.activeElement).toBe(btn);
        expect(accessibleName(btn)).toBe('Solicitar serviço');
        await loading(false);
        expect(document.activeElement).toBe(btn);
        expect(accessibleName(btn)).toBe('Solicitar serviço');
      });
    });

    describe('aria-describedby', () => {
      it('sem descrição: só "Carregando" durante, nada depois', async () => {
        await loading(true);
        expect(ownIds().length).toBe(1);
        expect(accessibleDescription(btn)).toBe('Carregando');

        await loading(false);
        expect(btn.hasAttribute('aria-describedby')).toBeFalse();
      });

      for (const inicial of ['d1', 'd1 d2']) {
        it(`com "${inicial}": soma "Carregando" e volta ao valor da tela`, async () => {
          screen.describedBy.set(inicial);
          await render();
          const description = accessibleDescription(btn);

          await loading(true);
          expect(describedIds().slice(0, -1).join(' ')).toBe(inicial);
          expect(accessibleDescription(btn)).toBe(`${description} Carregando`);

          await loading(false);
          expect(btn.getAttribute('aria-describedby')).toBe(inicial);
          expect(accessibleDescription(btn)).toBe(description);
        });
      }

      for (const [caso, antes, durante] of [
        ['alterada', 'd1', 'd2'],
        ['removida', 'd1', null],
        ['adicionada', null, 'd3'],
        ['ampliada', 'd1', 'd1 d3'],
      ] as const) {
        it(`descrição ${caso} pela tela durante o carregamento`, async () => {
          screen.describedBy.set(antes);
          await render();
          await loading(true);

          screen.describedBy.set(durante);
          await render();
          const daTela = idRefs(durante);
          expect(describedIds()).toEqual([...daTela, ownIds()[0]]);
          expect(ownIds().length).toBe(1);

          await loading(false);
          expect(btn.getAttribute('aria-describedby')).toBe(durante);
          expect(ownIds()).toEqual([]);
          expect(accessibleName(btn)).toBe('Solicitar serviço');
        });
      }

      it('mudança da tela e fim do carregamento no mesmo ciclo', async () => {
        screen.describedBy.set('d1');
        await render();
        await loading(true);
        screen.describedBy.set('d2');
        screen.loading.set(false);
        await render();
        expect(btn.getAttribute('aria-describedby')).toBe('d2');
      });

      it('nunca repete ids, mesmo com vários ciclos', async () => {
        screen.describedBy.set('d1 d2');
        await render();
        for (let i = 0; i < 3; i++) {
          await loading(true);
          const ids = describedIds();
          expect(new Set(ids).size).toBe(ids.length);
          expect(ownIds().length).toBe(1);
          await loading(false);
          expect(btn.getAttribute('aria-describedby')).toBe('d1 d2');
        }
      });
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

describe('TgButtonComponent: nome de iconOnly conforme a especificação', () => {
  // Cada caso foi conferido contra a árvore de acessibilidade do Chrome.
  const cases: Array<[string, string, string]> = [
    ['aria-label', `<button tgButton iconStart="x" [iconOnly]="true" aria-label="Fechar"></button>`, 'Fechar'],
    ['aria-labelledby', `<span id="r">Fechar janela</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="r"></button>`, 'Fechar janela'],
    ['aria-label vazio', `<button tgButton iconStart="x" [iconOnly]="true" aria-label=""></button>`, ''],
    ['aria-label só com espaços', `<button tgButton iconStart="x" [iconOnly]="true" aria-label="   "></button>`, ''],
    ['aria-labelledby inexistente', `<button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="nada"></button>`, ''],
    ['aria-labelledby vazio', `<span id="r">   </span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="r"></button>`, ''],
    ['vários ids', `<span id="a">Fechar</span><span id="b">janela</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a b"></button>`, 'Fechar janela'],
    ['vários ids, um inexistente', `<span id="a">Fechar</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="nada a"></button>`, 'Fechar'],
    ['aria-labelledby vence aria-label', `<span id="a">Fechar janela</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a" aria-label="X"></button>`, 'Fechar janela'],
    ['aria-labelledby vazio cai no aria-label', `<span id="a"></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a" aria-label="Fechar"></button>`, 'Fechar'],
    ['alvo com hidden', `<span id="a" hidden>Fechar</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, 'Fechar'],
    ['alvo com display:none e filhos', `<span id="a" style="display:none">Fechar <b>janela</b></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, 'Fechar janela'],
    ['alvo com aria-hidden', `<span id="a" aria-hidden="true">Fechar</span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, 'Fechar'],
    ['alvo visível com texto só escondido', `<span id="a"><span hidden>Fechar</span></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, ''],
    ['alvo com aria-label', `<span id="a" aria-label="Fechar"></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, 'Fechar'],
    ['alvo com imagem de alt', `<span id="a"><img alt="Fechar" src="data:," /></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, 'Fechar'],
    ['aria-labelledby não encadeia', `<span id="b">Fechar</span><span id="a" aria-labelledby="b"></span><button tgButton iconStart="x" [iconOnly]="true" aria-labelledby="a"></button>`, ''],
    ['title', `<button tgButton iconStart="x" [iconOnly]="true" title="Fechar"></button>`, 'Fechar'],
    ['label associado', `<label for="btn">Fechar</label><button id="btn" tgButton iconStart="x" [iconOnly]="true"></button>`, 'Fechar'],
    ['sem nome', `<button tgButton iconStart="x" [iconOnly]="true"></button>`, ''],
  ];

  for (const [caso, template, nome] of cases) {
    it(`${caso}: ${nome ? `nome "${nome}", sem aviso` : 'sem nome, avisa'}`, async () => {
      const warn = spyOn(console, 'warn');
      TestBed.overrideComponent(NameCaseHostComponent, { set: { template } });
      const caseFixture = TestBed.createComponent(NameCaseHostComponent);
      caseFixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve));
      const el = caseFixture.nativeElement.querySelector('button') as HTMLButtonElement;

      expect(accessibleName(el)).toBe(nome);
      const warnings = warn.calls.allArgs().filter(([message]) => String(message).startsWith('tgButton')).length;
      expect(warnings).toBe(nome ? 0 : 1);
    });
  }
});

describe('TgButtonComponent: inputs booleanos', () => {
  let fixture: ComponentFixture<BooleanAttributesHostComponent>;
  let host: BooleanAttributesHostComponent;
  const byId = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLButtonElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(BooleanAttributesHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('iconOnly sem valor ativa o modo, esconde o texto e mantém o nome', () => {
    const el = byId('icon-attr');
    expect(el.classList).toContain('tg-button--icon-only');
    expect(el.querySelector('.tg-button__label')).toBeNull();
    expect(el.textContent).not.toContain('Texto escondido');
    expect(accessibleName(el)).toBe('Fechar');
  });

  it('[iconOnly]="true" continua funcionando', () => {
    expect(byId('icon-true').classList).toContain('tg-button--icon-only');
  });

  for (const id of ['icon-false', 'icon-str-false', 'icon-none']) {
    it(`${id}: não ativa o modo e mantém o texto`, () => {
      const el = byId(id);
      expect(el.classList).not.toContain('tg-button--icon-only');
      expect(accessibleName(el)).toBe('Continuar');
    });
  }

  it('loading sem valor carrega, bloqueia o clique e mantém o foco', () => {
    const el = byId('loading-attr');
    el.focus();
    el.click();
    expect(el.classList).toContain('tg-button--loading');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(host.clicks).toBe(0);
    expect(document.activeElement).toBe(el);
    expect(accessibleName(el)).toBe('Salvando');
  });

  it('[loading] por binding liga e desliga', () => {
    const el = byId('loading-bind');
    host.isLoading.set(true);
    fixture.detectChanges();
    el.click();
    expect(el.classList).toContain('tg-button--loading');
    expect(host.clicks).toBe(0);

    host.isLoading.set(false);
    fixture.detectChanges();
    el.click();
    expect(el.classList).not.toContain('tg-button--loading');
    expect(host.clicks).toBe(1);
  });

  it('fullWidth sem valor e por binding', () => {
    expect(byId('full-attr').classList).toContain('tg-button--full');
    const bound = byId('full-bind');
    expect(bound.classList).not.toContain('tg-button--full');
    host.full.set(true);
    fixture.detectChanges();
    expect(bound.classList).toContain('tg-button--full');
  });

  it('exemplo da documentação compila e funciona', () => {
    const el = byId('docs');
    expect(el.classList).toContain('tg-button--icon-only');
    expect(el.classList).toContain('tg-button--ghost');
    expect(accessibleName(el)).toBe('Fechar');
  });
});

describe('TgButtonComponent: texto do aria-labelledby muda', () => {
  let fixture: ComponentFixture<LabelledByTextHostComponent>;
  let host: LabelledByTextHostComponent;
  let warn: jasmine.Spy;

  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
  };
  const warnings = () => warn.calls.allArgs().filter(([message]) => String(message).startsWith('tgButton')).length;

  beforeEach(async () => {
    warn = spyOn(console, 'warn');
    fixture = TestBed.createComponent(LabelledByTextHostComponent);
    host = fixture.componentInstance;
    await settle();
  });

  it('referência válida no início: sem aviso', () => {
    expect(warnings()).toBe(0);
  });

  it('texto vira vazio: avisa; volta a ter texto: para; mudanças repetidas não duplicam', async () => {
    host.label.set('');
    await settle();
    expect(warnings()).toBe(1);

    host.label.set('   ');
    await settle();
    expect(warnings()).toBe(1);

    host.label.set('Fechar janela');
    await settle();
    host.label.set('Fechar');
    await settle();
    expect(warnings()).toBe(1);

    host.label.set('');
    await settle();
    expect(warnings()).toBe(2);
  });

  it('troca de aria-labelledby passa a acompanhar o novo alvo', async () => {
    host.labelledBy.set('rotulo-b');
    await settle();
    expect(warnings()).toBe(1);

    host.other.set('Fechar');
    await settle();
    host.label.set(''); // o alvo antigo não importa mais
    await settle();
    expect(warnings()).toBe(1);

    host.other.set('');
    await settle();
    expect(warnings()).toBe(2);
  });

  it('alvo escondido continua valendo e é acompanhado', async () => {
    host.labelledBy.set('rotulo-oculto');
    await settle();
    expect(warnings()).toBe(0);

    host.label.set('');
    await settle();
    expect(warnings()).toBe(1);
  });

  it('depois de destruído, não observa mais', async () => {
    host.show.set(false);
    await settle();
    host.label.set('');
    await settle();
    expect(warnings()).toBe(0);
  });
});
