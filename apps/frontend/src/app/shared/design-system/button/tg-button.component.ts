import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgButtonAppearance = 'solid' | 'subtle' | 'outline' | 'ghost';
export type TgButtonTone = 'brand' | 'danger';
export type TgButtonSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * Botão do Design System TaskGo (Etapa 7).
 *
 * Aplicado sobre o elemento nativo para manter semântica, formulários e
 * routerLink: `<button tgButton>` ou `<a tgButton routerLink="…">`.
 * A cor vem do modo (cliente ou prestador), nunca do botão.
 */
@Component({
  selector: 'button[tgButton], a[tgButton]',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tg-button',
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
  },
  template: `
    @if (loading()) {
      <span class="tg-button__spinner" aria-hidden="true"></span>
      <!-- Fora do nome (hidden), mas lido como descrição via aria-describedby. -->
      <span [id]="statusId" hidden>Carregando</span>
    }
    <span class="tg-button__content" [class.tg-button__content--hidden]="loading()">
      @if (iconStart(); as icon) {
        <tg-icon [name]="icon" [size]="iconSize()" />
      }
      @if (!iconOnly()) {
        <span class="tg-button__label"><ng-content /></span>
      }
      @if (iconEnd(); as icon) {
        <tg-icon [name]="icon" [size]="iconSize()" />
      }
    </span>
  `,
  styleUrl: './tg-button.component.scss',
})
export class TgButtonComponent {
  readonly appearance = input<TgButtonAppearance>('solid');
  readonly tone = input<TgButtonTone>('brand');
  readonly size = input<TgButtonSize>('md');
  readonly loading = input(false);
  readonly fullWidth = input(false);
  readonly iconStart = input<TgIconName | undefined>(undefined);
  readonly iconEnd = input<TgIconName | undefined>(undefined);
  /** Botão só de ícone: use `iconStart` e o atributo nativo `aria-label`. */
  readonly iconOnly = input(false);

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);

  /** Id do texto "Carregando", ligado ao host por aria-describedby. */
  protected readonly statusId = `tg-button-status-${nextId++}`;

  readonly iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));

  readonly classes = computed(() =>
    [
      'tg-button',
      `tg-button--${this.appearance()}`,
      `tg-button--${this.tone()}`,
      `tg-button--${this.size()}`,
      this.fullWidth() ? 'tg-button--full' : '',
      this.iconOnly() ? 'tg-button--icon-only' : '',
      this.loading() ? 'tg-button--loading' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  constructor() {
    // Carregando: o nome da ação não muda (o conteúdo só fica transparente).
    // O estado vai à parte: aria-busy, aria-disabled e a descrição
    // "Carregando" somada ao aria-describedby da tela. Não usamos host
    // binding para não apagar atributos que a tela tenha colocado; ao
    // terminar, os dois voltam ao valor anterior.
    let applied = false;
    let previousDisabled: string | null = null;
    let previousDescribedBy: string | null = null;
    effect(() => {
      const el = this.#host.nativeElement;
      if (this.loading() && !applied) {
        previousDisabled = el.getAttribute('aria-disabled');
        previousDescribedBy = el.getAttribute('aria-describedby');
        el.setAttribute('aria-disabled', 'true');
        el.setAttribute('aria-describedby', [previousDescribedBy, this.statusId].filter(Boolean).join(' '));
        applied = true;
      } else if (!this.loading() && applied) {
        restoreAttribute(el, 'aria-disabled', previousDisabled);
        restoreAttribute(el, 'aria-describedby', previousDescribedBy);
        applied = false;
      }
    });

    // Bloqueia só a ativação. Mouse, Enter e Espaço chegam como `click` (é o
    // que o navegador dispara ao ativar button e link), então teclado, foco e
    // Tab seguem livres. A fase de captura roda antes dos (click) e do
    // routerLink registrados no mesmo elemento.
    const el = this.#host.nativeElement;
    const block = (event: Event) => {
      if (!this.#isInteractionBlocked()) return;
      event.preventDefault(); // impede navegação do link e envio de formulário
      event.stopImmediatePropagation(); // impede os handlers da tela
    };
    el.addEventListener('click', block, true);
    this.#destroyRef.onDestroy(() => el.removeEventListener('click', block, true));

    // Só em desenvolvimento: o build de produção remove este bloco.
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      this.#warnWhenIconOnlyHasNoName();
    }
  }

  /**
   * Avisa quando `iconOnly` fica sem nome acessível. Reavalia quando
   * `iconOnly` muda (signal) e quando `aria-label` ou `aria-labelledby` do
   * próprio host mudam (MutationObserver só nesses dois atributos). Avisa uma
   * vez por entrada no estado inválido.
   */
  #warnWhenIconOnlyHasNoName() {
    const el = this.#host.nativeElement;
    let warned = false;
    const check = () => {
      const invalid = this.iconOnly() && !hasAccessibleName(el);
      if (invalid && !warned) {
        console.warn('tgButton: botão só de ícone precisa de aria-label ou aria-labelledby com texto.', el);
      }
      warned = invalid;
    };

    afterRenderEffect(check);
    afterNextRender(() => {
      const observer = new MutationObserver(check);
      observer.observe(el, { attributes: true, attributeFilter: ['aria-label', 'aria-labelledby'] });
      this.#destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * Indisponível sem `disabled` nativo: carregando ou `aria-disabled="true"`
   * posto pela tela. O `disabled` nativo já não dispara `click`, então fica
   * com o navegador.
   */
  #isInteractionBlocked(): boolean {
    return this.loading() || this.#host.nativeElement.getAttribute('aria-disabled') === 'true';
  }
}

function restoreAttribute(el: HTMLElement, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

/**
 * Nome vindo de `aria-labelledby` (precede) ou `aria-label`, ignorando texto
 * vazio ou só com espaços. Subconjunto do cálculo de nome acessível que cobre
 * botão só de ícone, cujo conteúdo é sempre decorativo.
 */
function hasAccessibleName(el: HTMLElement): boolean {
  const ids = el.getAttribute('aria-labelledby')?.trim().split(/\s+/).filter(Boolean) ?? [];
  const root = el.getRootNode() as Document | ShadowRoot;
  const labelledBy = ids
    .map((id) => root.getElementById?.(id))
    .map((ref) => ref?.getAttribute('aria-label')?.trim() || ref?.textContent?.trim() || '')
    .join('');
  return labelledBy !== '' || !!el.getAttribute('aria-label')?.trim();
}
