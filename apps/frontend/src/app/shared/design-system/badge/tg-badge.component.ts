import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

/** Os cinco tons de status (Etapa 2), mais neutro e destaque para etiquetas. */
export type TgBadgeTone = 'waiting' | 'confirmed' | 'progress' | 'done' | 'cancelled' | 'neutral' | 'accent';

/**
 * Badge do Design System TaskGo (Etapa 7): etiqueta que só mostra o status
 * de um pedido ou pagamento, ou uma marca como "Principal".
 *
 *   <tg-badge tone="done">Concluído</tg-badge>
 *   <tg-badge tone="progress" icon="map-pin">Profissional a caminho</tg-badge>
 *   <tg-badge>Principal</tg-badge>
 *
 * Nunca é clicável nem recebe foco: escolhas são rádio, card de escolha ou
 * chip. É texto comum (sem role); o ícone é decorativo. A cor vem do modo.
 */
@Component({
  selector: 'tg-badge',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `
    @if (icon(); as name) {
      <tg-icon [name]="name" [size]="14" />
    }
    <ng-content />
  `,
  styleUrl: './tg-badge.component.scss',
})
export class TgBadgeComponent {
  /** Tom do badge. Status usam os cinco primeiros; etiquetas, `neutral` ou `accent`. */
  readonly tone = input<TgBadgeTone>('neutral');
  /** Ícone opcional e decorativo, antes do texto. */
  readonly icon = input<TgIconName | undefined>(undefined);

  protected readonly classes = computed(() => `tg-badge tg-badge--${this.tone()}`);
}
