import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
 * ("Mostrar senha"); o estado vai por aria-pressed.
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
      [attr.aria-pressed]="visible()"
      [attr.aria-controls]="field?.control()?.id()"
      (click)="toggle()"
    >
      <tg-icon [name]="visible() ? 'eye-slash' : 'eye'" [size]="20" />
    </button>
  `,
})
export class TgPasswordToggleComponent {
  protected readonly field = inject(TgFieldComponent, { optional: true });
  readonly visible = signal(false);

  toggle() {
    const input = this.field?.control()?.element;
    if (!input) return;
    this.visible.update((v) => !v);
    input.setAttribute('type', this.visible() ? 'text' : 'password');
  }
}
