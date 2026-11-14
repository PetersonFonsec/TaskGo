import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input } from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgButtonAppearance = 'solid' | 'subtle' | 'outline' | 'ghost';
export type TgButtonTone = 'brand' | 'danger';
export type TgButtonSize = 'sm' | 'md' | 'lg';

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
      <span class="tg-button__sr">Carregando</span>
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
    // Carregando: anuncia como indisponível sem tirar o foco. Não usamos host
    // binding para não apagar um aria-disabled que a tela tenha colocado.
    let applied = false;
    let previous: string | null = null;
    effect(() => {
      const el = this.#host.nativeElement;
      if (this.loading() && !applied) {
        previous = el.getAttribute('aria-disabled');
        el.setAttribute('aria-disabled', 'true');
        applied = true;
      } else if (!this.loading() && applied) {
        if (previous === null) el.removeAttribute('aria-disabled');
        else el.setAttribute('aria-disabled', previous);
        applied = false;
      }
    });

    // Captura: roda antes dos (click) que a tela registra no mesmo elemento.
    const el = this.#host.nativeElement;
    const block = (event: Event) => this.blockWhileLoading(event);
    el.addEventListener('click', block, true);
    inject(DestroyRef).onDestroy(() => el.removeEventListener('click', block, true));

    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      queueMicrotask(() => {
        if (this.iconOnly() && !this.#host.nativeElement.getAttribute('aria-label')) {
          console.warn('tgButton: botão só de ícone precisa de aria-label.', this.#host.nativeElement);
        }
      });
    }
  }

  /** Carregando não desabilita (o foco fica no botão), mas bloqueia a ação. */
  blockWhileLoading(event: Event) {
    if (!this.loading()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
