import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgFieldComponent } from './tg-field.component';

/**
 * Botão de mostrar ou ocultar a senha, no fim de um `tg-field`:
 *
 *   <tg-field label="Senha">
 *     <input tgInput type="password" autocomplete="current-password" />
 *     <tg-password-toggle tgSuffix />
 *   </tg-field>
 *
 * Troca o `type` do input entre password e text. O nome não muda
 * ("Mostrar senha"); o estado vai por aria-pressed, que segue o tipo real do
 * input. Fica indisponível sem input, com input que não começou como senha
 * e com o input desabilitado; desabilitar o input oculta a senha de novo.
 */
@Component({
  selector: 'tg-password-toggle',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tg-field__affix' },
  template: `
    <button
      type="button"
      class="tg-field__toggle"
      aria-label="Mostrar senha"
      [disabled]="!available()"
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="input()?.id || null"
      (click)="toggle()"
    >
      <tg-icon [name]="visible() ? 'eye-slash' : 'eye'" [size]="20" />
    </button>
  `,
})
export class TgPasswordToggleComponent {
  protected readonly field = inject(TgFieldComponent, { optional: true });

  /** O input do campo, se ele for de senha (type="password" quando ligado). */
  protected readonly input = signal<HTMLInputElement | null>(null);
  readonly #disabled = signal(false);
  readonly visible = signal(false);
  protected readonly available = computed(() => !!this.input() && !this.#disabled());

  constructor() {
    let observer: MutationObserver | null = null;
    inject(DestroyRef).onDestroy(() => observer?.disconnect());

    effect(() => {
      const element = this.field?.control()?.element;
      if (this.input() || !(element instanceof HTMLInputElement) || element.type !== 'password') return;
      this.input.set(element);
      this.#sync();
      // Só o input, só type e disabled: acompanha form.disable(), [disabled]
      // e trocas de tipo feitas pela tela.
      if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(() => this.#sync());
        observer.observe(element, { attributes: true, attributeFilter: ['type', 'disabled'] });
      }
    });
  }

  toggle() {
    const input = this.input();
    if (!input || !this.available()) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    this.#sync();
  }

  #sync() {
    const input = this.input();
    if (!input) return;
    if (input.disabled && input.type !== 'password') input.type = 'password';
    this.#disabled.set(input.disabled);
    this.visible.set(input.type === 'text');
  }
}
