import {
  ChangeDetectionStrategy,
  Component,
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

  constructor() {
    if (devMode()) afterNextRender(() => this.#checkContent());
  }

  #kindOf(el: HTMLElement): Kind {
    const tag = el.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'label') return 'choice';
    return 'surface';
  }

  // Avisos só em desenvolvimento; o componente não corrige a marcação.
  #checkContent() {
    if (this.kind === 'link' && this.element.querySelector(INTERACTIVE)) {
      console.warn(
        'tgCard: um link não pode conter botões, links ou campos. Use tg-card com tgCardLink no título.',
        this.element,
      );
    }
    if (this.kind === 'choice' && !this.element.querySelector('input[type="radio"], input[type="checkbox"]')) {
      console.warn('tgCard: label tgCard precisa de um input radio ou checkbox dentro.', this.element);
    }
  }
}

/**
 * Link do título de um `tg-card` com ações dentro. Estica-se sobre o card
 * (clicar em qualquer ponto abre o destino); botões e links do card ficam
 * por cima e continuam funcionando.
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
