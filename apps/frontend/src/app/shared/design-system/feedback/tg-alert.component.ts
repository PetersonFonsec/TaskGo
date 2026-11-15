import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgFeedbackTone = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<TgFeedbackTone, [TgIconName, 'regular' | 'fill']> = {
  info: ['warning-circle', 'regular'],
  success: ['check', 'regular'],
  warning: ['warning-circle', 'fill'],
  danger: ['warning-circle', 'fill'],
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Alerta do Design System TaskGo (Etapa 7): explica um problema ou um estado
 * e fica na tela até deixar de valer. Erro nunca é toast: é alerta.
 *
 *   <tg-alert tone="danger" title="Não foi possível carregar seus pedidos">
 *     Verifique sua conexão e tente de novo.
 *     <button tgButton tgAlertAction appearance="outline" size="sm" (click)="recarregar()">Tentar de novo</button>
 *   </tg-alert>
 *
 * Papel: `danger` é `role="alert"` (anunciado quando entra na tela depois de
 * uma ação); os demais, `role="status"`. Presente desde o carregamento, não
 * anuncia: é conteúdo. Só os informativos devem ter `dismissible`.
 */
@Component({
  selector: 'tg-alert',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "'tg-alert tg-alert--' + tone()",
    '[attr.role]': "tone() === 'danger' ? 'alert' : 'status'",
    '[hidden]': 'dismissed()',
  },
  template: `
    <tg-icon class="tg-alert__icon" [name]="icon()[0]" [weight]="icon()[1]" [size]="22" />
    <div class="tg-alert__content">
      @if (title()) {
        <p class="tg-alert__title">{{ title() }}</p>
      }
      <div class="tg-alert__text"><ng-content /></div>
      <div class="tg-alert__actions"><ng-content select="[tgAlertAction]" /></div>
    </div>
    @if (dismissible()) {
      <button type="button" class="tg-alert__close" [attr.aria-label]="closeLabel()" (click)="dismiss()">
        <tg-icon name="x" [size]="20" />
      </button>
    }
  `,
  styleUrl: './tg-alert.component.scss',
})
export class TgAlertComponent {
  /** Tom: info, success, warning ou danger. */
  readonly tone = input<TgFeedbackTone>('info');
  /** Título curto, opcional. */
  readonly title = input('');
  /** Mostra o botão de fechar. Só para avisos informativos. */
  readonly dismissible = input(false, { transform: booleanAttribute });
  /** Nome do botão de fechar. */
  readonly closeLabel = input('Fechar aviso');
  /** Fechado pela pessoa. */
  readonly closed = output<void>();

  protected readonly icon = computed(() => ICONS[this.tone()]);
  protected readonly dismissed = signal(false);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Esconde o alerta. Se o foco estava nele, vai para o próximo controle da página. */
  dismiss() {
    const doc = this.#host.ownerDocument;
    const hadFocus = this.#host.contains(doc.activeElement);
    const next = hadFocus ? this.#neighbour() : null;
    this.dismissed.set(true);
    this.closed.emit();
    next?.focus();
  }

  #neighbour(): HTMLElement | null {
    const all = Array.from(this.#host.ownerDocument.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => !this.#host.contains(el) && !el.closest('[inert],[hidden]'),
    );
    const after = all.find((el) => this.#host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    return after ?? all.filter((el) => this.#host.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING).pop() ?? null;
  }
}
