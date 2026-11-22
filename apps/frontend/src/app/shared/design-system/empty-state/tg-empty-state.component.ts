import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterEveryRender,
  booleanAttribute,
  computed,
  inject,
  input,
  isDevMode,
  viewChild,
} from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgEmptyStateLevel = 1 | 2 | 3 | 4 | 5 | 6;

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
 * (`level`, inteiro de 2 a 6, padrão 2), ícone decorativo, sem role de
 * alerta. O compacto responde à largura do contêiner: abaixo de 480 px, a
 * ação desce, alinhada ao texto.
 */
@Component({
  selector: 'tg-empty-state',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "compact() ? 'tg-empty-state tg-empty-state--compact' : 'tg-empty-state'",
  },
  // A caixa interna existe para o compacto: o host é o contêiner da container
  // query (um elemento não consulta o próprio tamanho).
  template: `
    <div class="tg-empty-state__box">
    @if (illustrationSrc(); as src) {
      <img class="tg-empty-state__illustration" [src]="src" [alt]="illustrationAlt()" />
    } @else if (icon(); as name) {
      <span class="tg-empty-state__icon"><tg-icon [name]="name" [size]="compact() ? 22 : 32" /></span>
    }
    <div class="tg-empty-state__body">
      @switch (headingLevel()) {
        @case (1) { <h1 class="tg-empty-state__title tg-empty-state__title--level-1">{{ title() }}</h1> }
        @case (3) { <h3 class="tg-empty-state__title">{{ title() }}</h3> }
        @case (4) { <h4 class="tg-empty-state__title">{{ title() }}</h4> }
        @case (5) { <h5 class="tg-empty-state__title">{{ title() }}</h5> }
        @case (6) { <h6 class="tg-empty-state__title">{{ title() }}</h6> }
        @default { <h2 class="tg-empty-state__title">{{ title() }}</h2> }
      }
      <div #text class="tg-empty-state__text"><ng-content /></div>
    </div>
    <div #action class="tg-empty-state__action"><ng-content select="[tgEmptyAction], [tgEmptySecondaryAction]" /></div>
    </div>
  `,
  styleUrl: './tg-empty-state.component.scss',
})
export class TgEmptyStateComponent {
  /** O que falta, como "Você ainda não fez nenhum pedido". */
  readonly title = input.required<string>();
  /** Ícone decorativo, do conjunto do Design System. */
  readonly icon = input<TgIconName | undefined>(undefined);
  /** Ilustração opcional, exibida no lugar do ícone. */
  readonly illustrationSrc = input<string | undefined>(undefined);
  readonly illustrationAlt = input('');
  /** Em linha, para uma seção dentro de uma tela maior. */
  readonly compact = input(false, { transform: booleanAttribute });
  /** Nível do heading do título, para encaixar na estrutura da tela. */
  readonly level = input<TgEmptyStateLevel | `${TgEmptyStateLevel}`>(2);

  protected readonly headingLevel = computed(() => {
    const level = Number(this.level());
    return Number.isInteger(level) && level >= 1 && level <= 6 ? level : 2;
  });

  private readonly text = viewChild.required<ElementRef<HTMLElement>>('text');
  private readonly action = viewChild.required<ElementRef<HTMLElement>>('action');
  #warnedActions = false;

  constructor() {
    // Depois de cada renderização: o CSS não vê texto, então `:empty` falha
    // com espaços ou com os marcadores de um @if. Aqui se marca o slot vazio
    // de verdade (sem texto nem elemento) e, em desenvolvimento, se avisa
    // quando há mais de duas ações. Não roda no servidor; lá vale o `:empty`.
    afterEveryRender(() => {
      const text = this.text().nativeElement;
      const action = this.action().nativeElement;
      text.classList.toggle('tg-empty-state__text--empty', isBlank(text));
      action.classList.toggle('tg-empty-state__action--empty', action.children.length === 0);
      if (!isDevMode()) return;
      const many = action.children.length > 2;
      if (many && !this.#warnedActions) {
        console.warn(
          `tg-empty-state "${this.title()}": use no máximo duas ações (${action.children.length} elementos de ação). ` +
            'Todas continuam na tela; mantenha uma ação principal e uma secundária.',
        );
      }
      this.#warnedActions = many;
    });
  }
}

/** Sem texto visível nem elemento. */
function isBlank(el: HTMLElement) {
  return el.children.length === 0 && (el.textContent ?? '').trim() === '';
}
