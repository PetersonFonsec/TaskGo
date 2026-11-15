import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgOverlay } from './tg-overlay';

/**
 * Painel do Design System TaskGo (Etapa 7): abriga uma tarefa, como filtros
 * ou um endereço. Abaixo de 600 px sobe de baixo (bottom sheet, sem alça de
 * arrastar); a partir de 600 px fica à direita, com 440 px.
 *
 *   <tg-sheet #filtros title="Filtros">
 *     … campos …
 *     <button tgButton tgSheetAction appearance="outline" (click)="limpar()">Limpar</button>
 *     <button tgButton tgSheetAction (click)="aplicar(); filtros.close()">Aplicar filtros</button>
 *   </tg-sheet>
 *
 * Título e fechar ficam fixos no topo, as ações fixas embaixo, e só o meio
 * rola. Fecha pelo X ("Fechar"), por Esc e pelo toque no fundo. Durante o
 * envio, o X fica indisponível por aria-disabled (não sai do foco).
 */
@Component({
  selector: 'tg-sheet',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'tg-sheet-host' },
  template: `
    <dialog
      #dialog
      class="tg-sheet"
      [attr.aria-labelledby]="titleId"
      [attr.aria-busy]="busy() || null"
      (keydown)="onKeydown($event)"
      (cancel)="onCancel($event)"
      (close)="onClose()"
      (click)="onClick($event)"
    >
      <header class="tg-sheet__header">
        <h2 class="tg-sheet__title" [id]="titleId">{{ title() }}</h2>
        <button type="button" class="tg-sheet__close" aria-label="Fechar"
          [attr.aria-disabled]="busy() || null"
          (click)="requestClose()">
          <tg-icon name="x" [size]="22" />
        </button>
      </header>
      <div class="tg-sheet__body"><ng-content /></div>
      <div class="tg-sheet__actions"><ng-content select="[tgSheetAction]" /></div>
    </dialog>
  `,
  styleUrl: './tg-overlay.scss',
})
export class TgSheetComponent extends TgOverlay {}
