import { ChangeDetectionStrategy, Component, booleanAttribute, computed, input } from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgEmptyStateLevel = 2 | 3 | 4 | 5 | 6;

/**
 * Estado vazio do Design System TaskGo (Etapa 7): quando não há nada para
 * mostrar, diz o que falta e qual é o próximo passo.
 *
 *   <tg-empty-state icon="receipt" title="Você ainda não fez nenhum pedido">
 *     Encontre um profissional e agende em poucos passos.
 *     <a tgButton tgEmptyAction routerLink="/buscar">Buscar profissionais</a>
 *   </tg-empty-state>
 *
 *   <tg-empty-state compact icon="calendar-blank" title="Sua agenda está livre" [level]="3">
 *     Quando você contratar um serviço, ele aparece aqui.
 *   </tg-empty-state>
 *
 * Grande (padrão) quando a lista é o assunto da tela ou numa busca sem
 * resultado; `compact` para uma seção dentro de uma tela maior. No máximo
 * uma ação, sempre o próximo passo. É conteúdo comum: título como heading
 * (`level`, padrão 2), ícone decorativo, sem role de alerta.
 */
@Component({
  selector: 'tg-empty-state',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "compact() ? 'tg-empty-state tg-empty-state--compact' : 'tg-empty-state'",
  },
  template: `
    @if (icon(); as name) {
      <span class="tg-empty-state__icon"><tg-icon [name]="name" [size]="compact() ? 22 : 32" /></span>
    }
    <div class="tg-empty-state__body">
      @switch (headingLevel()) {
        @case (3) { <h3 class="tg-empty-state__title">{{ title() }}</h3> }
        @case (4) { <h4 class="tg-empty-state__title">{{ title() }}</h4> }
        @case (5) { <h5 class="tg-empty-state__title">{{ title() }}</h5> }
        @case (6) { <h6 class="tg-empty-state__title">{{ title() }}</h6> }
        @default { <h2 class="tg-empty-state__title">{{ title() }}</h2> }
      }
      <div class="tg-empty-state__text"><ng-content /></div>
    </div>
    <div class="tg-empty-state__action"><ng-content select="[tgEmptyAction]" /></div>
  `,
  styleUrl: './tg-empty-state.component.scss',
})
export class TgEmptyStateComponent {
  /** O que falta, como "Você ainda não fez nenhum pedido". */
  readonly title = input.required<string>();
  /** Ícone decorativo, do conjunto do Design System. */
  readonly icon = input<TgIconName | undefined>(undefined);
  /** Em linha, para uma seção dentro de uma tela maior. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Nível do heading do título, para encaixar na estrutura da tela. */
  readonly level = input<TgEmptyStateLevel | `${TgEmptyStateLevel}`>(2);

  protected readonly headingLevel = computed(() => {
    const level = Number(this.level());
    return level >= 2 && level <= 6 ? Math.floor(level) : 2;
  });
}
