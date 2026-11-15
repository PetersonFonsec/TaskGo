import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  ElementRef,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
} from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgCardAppearance = 'outlined' | 'elevated' | 'subtle';
/** Escolha (`label tgCard`): ✓ no canto com o input oculto, ou o input visível. */
export type TgCardIndicator = 'check' | 'control';

type Kind = 'surface' | 'link' | 'choice';

const INTERACTIVE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const CHOICE_CONTROL = 'input[type="radio"], input[type="checkbox"]';

const devMode = () => typeof ngDevMode !== 'undefined' && !!ngDevMode;

/**
 * Card do Design System TaskGo (Etapa 7). Uma superfície com três
 * aparências; o conteúdo é da tela.
 *
 *   <tg-card>…</tg-card>                          só conteúdo
 *   <a tgCard routerLink="/categorias/limpeza">…</a>   o card inteiro é um link
 *   <tg-card>                                     com ações dentro:
 *     <a tgCardLink routerLink="…">Marina Souza</a>   o título é o link e se
 *     <button tgButton …>…</button>                   estica sobre o card
 *   </tg-card>
 *   <label tgCard>                                escolha: rádio ou checkbox
 *     <input type="radio" name="categoria" />         nativo dentro do label
 *     …
 *   </label>
 *
 * O card não leva role nem fixa o nível do título. A cor vem do modo.
 */
@Component({
  selector: 'tg-card, a[tgCard], label[tgCard]',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Os estilos alcançam o conteúdo projetado (link esticado, input da escolha).
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'tg-card',
    '[class.tg-card--outlined]': "appearance() === 'outlined'",
    '[class.tg-card--elevated]': "appearance() === 'elevated'",
    '[class.tg-card--subtle]': "appearance() === 'subtle'",
    '[class.tg-card--dense]': 'dense()',
    '[class.tg-card--link]': "kind === 'link'",
    '[class.tg-card--choice]': "kind === 'choice'",
    '[class.tg-card--check]': 'showsCheck()',
  },
  template: `
    <ng-content />
    @if (showsCheck()) {
      <span class="tg-card__check" aria-hidden="true">
        <tg-icon name="check" [size]="14" />
      </span>
    }
  `,
  styleUrl: './tg-card.component.scss',
})
export class TgCardComponent {
  /** `outlined` (padrão), `elevated` só para destaque, `subtle` dentro de outra superfície. */
  readonly appearance = input<TgCardAppearance>('outlined');
  /** Padding de 16 px em vez de 20, para grades densas. */
  readonly dense = input(false, { transform: booleanAttribute });
  /** Só em `label tgCard`. */
  readonly indicator = input<TgCardIndicator>('check');

  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly kind: Kind = this.#kindOf(this.element);

  protected readonly showsCheck = computed(() => this.kind === 'choice' && this.indicator() === 'check');

  readonly #destroyRef = inject(DestroyRef);

  constructor() {
    if (devMode() && this.kind !== 'surface') afterNextRender(() => this.#watchContent());
  }

  #kindOf(el: HTMLElement): Kind {
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'label') return 'choice';
    return 'surface';
  }

  /**
   * Avisos só em desenvolvimento; o componente não corrige a marcação.
   * Confere depois da primeira renderização e a cada mudança no conteúdo
   * (um @if que insere um botão, um input que muda de tipo). O observer
   * existe só no build de desenvolvimento, só em a tgCard e label tgCard, e
   * é desligado quando o card é destruído. Cada aviso sai uma vez a cada
   * vez que a marcação entra no estado inválido.
   */
  #watchContent() {
    let warned: string | null = null;
    const check = () => {
      const problem = this.#problem();
      if (problem && problem !== warned) console.warn(problem, this.element);
      warned = problem;
    };
    check();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(check);
    observer.observe(this.element, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'tabindex', 'type'],
    });
    this.#destroyRef.onDestroy(() => observer.disconnect());
  }

  #problem(): string | null {
    if (this.kind === 'link' && this.element.querySelector(INTERACTIVE)) {
      return 'tgCard: um link não pode conter botões, links ou campos. Use tg-card com tgCardLink no título.';
    }
    if (this.kind === 'choice' && !this.element.querySelector(CHOICE_CONTROL)) {
      return 'tgCard: label tgCard precisa de um input radio ou checkbox dentro.';
    }
    return null;
  }
}

/**
 * Link do título de um `tg-card` com ações dentro. Estica-se sobre o card
 * (clicar em qualquer ponto abre o destino); botões, links e campos do card
 * ficam por cima e continuam funcionando. Uma ação que o CSS não enxerga
 * (shadow DOM, web component, elemento com role) leva o atributo
 * `tgCardAction` no host para ficar por cima também.
 *
 * O lugar do link vem da injeção de dependência e não muda depois de
 * criado, então a conferência é feita uma vez.
 */
@Directive({
  selector: 'a[tgCardLink]',
  host: { class: 'tg-card__link' },
})
export class TgCardLinkDirective {
  readonly #card = inject(TgCardComponent, { optional: true });
  readonly #element = inject<ElementRef<HTMLAnchorElement>>(ElementRef).nativeElement;

  constructor() {
    if (!devMode()) return;
    afterNextRender(() => {
      if (!this.#card || this.#card.kind !== 'surface') {
        console.warn('tgCardLink: use dentro de um tg-card (não em a tgCard nem fora de um card).', this.#element);
      }
    });
  }
}
