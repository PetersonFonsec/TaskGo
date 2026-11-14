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

  it('renderiza o ícone como decorativo', () => {
    host.iconStart.set('arrow-right');
    fixture.detectChanges();
    const svg = button.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});
