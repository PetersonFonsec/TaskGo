import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  computed,
  input,
  signal,
} from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgFieldVariant = 'default' | 'search';

let nextId = 0;

/** O que o campo precisa saber do input projetado (ver TgInputDirective). */
export interface TgFieldControl {
  readonly id: () => string;
  readonly element: HTMLInputElement | HTMLTextAreaElement;
}

/**
 * Campo de texto do Design System TaskGo (Etapa 7).
 *
 * Envolve um input ou textarea nativo com `tgInput`, que continua recebendo
 * ngModel, formControl, máscara e autocomplete diretamente:
 *
 *   <tg-field label="E-mail" [error]="mensagem">
 *     <input tgInput type="email" autocomplete="email" [(ngModel)]="email" />
 *   </tg-field>
 *
 * O campo cuida do rótulo (`label for`), da dica e da mensagem de erro, que
 * o input recebe por `aria-describedby` e `aria-invalid`. A cor vem do modo.
 */
@Component({
  selector: 'tg-field',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Os estilos alcançam o input projetado, que é conteúdo da tela.
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tg-field',
    '[class.tg-field--search]': "variant() === 'search'",
    '[class.tg-field--invalid]': 'invalid()',
  },
  template: `
    <label class="tg-field__label" [class.tg-field__sr]="labelHidden()" [attr.for]="control()?.id()">
      {{ label() }}
      @if (optional()) {
        <span class="tg-field__optional">(opcional)</span>
      }
    </label>
    <div class="tg-field__control">
      @if (variant() === 'search') {
        <tg-icon class="tg-field__affix" name="magnifying-glass" [size]="20" />
      }
      <ng-content select="[tgPrefix]" />
      <ng-content />
      <ng-content select="[tgSuffix]" />
    </div>
    <!-- Sempre presente: o aria-live anuncia o erro quando ele aparece. -->
    <div class="tg-field__message" aria-live="polite">
      @if (invalid()) {
        <span class="tg-field__error" [id]="errorId">
          <tg-icon name="warning-circle" [size]="16" />
          <span>{{ error() }}</span>
        </span>
      } @else if (hint()) {
        <span class="tg-field__hint" [id]="hintId">{{ hint() }}</span>
      }
    </div>
  `,
  styleUrl: './tg-field.component.scss',
})
export class TgFieldComponent {
  /** Rótulo visível. Obrigatório: o placeholder não substitui o rótulo. */
  readonly label = input.required<string>();
  /** Texto de apoio abaixo do campo. Some enquanto houver erro. */
  readonly hint = input('');
  /** Mensagem de erro dizendo como corrigir. Vazia: sem erro. */
  readonly error = input('');
  /** Marca "(opcional)" no rótulo; obrigatório não leva asterisco. */
  readonly optional = input(false, { transform: booleanAttribute });
  /** `search`: pílula com lupa e rótulo só para leitor de tela. */
  readonly variant = input<TgFieldVariant>('default');

  readonly hintId = `tg-field-hint-${nextId}`;
  readonly errorId = `tg-field-error-${nextId++}`;

  readonly control = signal<TgFieldControl | null>(null);
  readonly invalid = computed(() => this.error().trim() !== '');
  readonly labelHidden = computed(() => this.variant() === 'search');

  /** Ids que o input soma ao seu aria-describedby. */
  readonly describedBy = computed(() => {
    if (this.invalid()) return this.errorId;
    return this.hint() ? this.hintId : null;
  });

  register(control: TgFieldControl) {
    this.control.set(control);
  }
}
