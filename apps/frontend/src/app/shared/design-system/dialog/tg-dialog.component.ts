import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, input, viewChild } from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgOverlay } from './tg-overlay';

export type TgDialogTone = 'brand' | 'danger';

/**
 * Diálogo do Design System TaskGo (Etapa 7): pede uma decisão curta.
 * Centralizado em todos os tamanhos, até 440 px.
 *
 *   <tg-dialog #recusar title="Recusar este pedido?" icon="warning-circle" tone="danger" [busy]="enviando()">
 *     <p>Ana Souza recebe o aviso e pode pedir a outro profissional.</p>
 *     <button tgButton tgDialogAction appearance="outline" (click)="recusar.close()">Voltar</button>
 *     <button tgButton tgDialogAction tone="danger" [loading]="enviando()" (click)="confirmar()">Recusar pedido</button>
 *   </tg-dialog>
 *
 * Durante o envio, use `[busy]` no diálogo e `[loading]` na ação principal
 * (o botão continua focável e informa "Carregando").
 *
 * Ações: no máximo duas, a segura primeiro (ela recebe o foco ao abrir) e a
 * principal por último. Sem ações, ou com a segura indisponível, o foco
 * começa no próprio diálogo. Abaixo de 600 px, empilham com a largura toda e a
 * principal em cima; acima, lado a lado, com a principal à direita.
 */
@Component({
  selector: 'tg-dialog',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'tg-dialog-host' },
  template: `
    <dialog
      #dialog
      class="tg-dialog"
      tabindex="-1"
      [class.tg-dialog--danger]="tone() === 'danger'"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="bodyId"
      [attr.aria-busy]="busy() || null"
      (keydown)="onKeydown($event)"
      (cancel)="onCancel($event)"
      (close)="onClose()"
      (click)="onClick($event)"
    >
      @if (icon(); as name) {
        <span class="tg-dialog__icon"><tg-icon [name]="name" [size]="26" /></span>
      }
      <h2 class="tg-dialog__title" [id]="titleId">{{ title() }}</h2>
      <div class="tg-dialog__body" [id]="bodyId"><ng-content /></div>
      <div #actions class="tg-dialog__actions"><ng-content select="[tgDialogAction]" /></div>
    </dialog>
  `,
  styleUrl: './tg-overlay.scss',
})
export class TgDialogComponent extends TgOverlay {
  /** Ícone decorativo acima do título. */
  readonly icon = input<TgIconName | undefined>(undefined);
  /** `danger` para decisões que não se desfazem: muda a cor do ícone. */
  readonly tone = input<TgDialogTone>('brand');

  private readonly actions = viewChild.required<ElementRef<HTMLElement>>('actions');

  /**
   * A ação segura: a primeira declarada. Se ela estiver indisponível, o foco
   * vai para o diálogo, nunca para a seguinte (que pode ser a de perigo).
   */
  protected initialFocus() {
    return this.actions().nativeElement.querySelector<HTMLElement>('[tgDialogAction]');
  }
}
