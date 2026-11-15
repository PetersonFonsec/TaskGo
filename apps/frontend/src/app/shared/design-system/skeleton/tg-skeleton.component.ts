import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

export type TgSkeletonShape = 'text' | 'circle' | 'rect';
export type TgSkeletonRadius = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Número vira px; texto (como `62%`) vai como está. */
const size = (value: string | number | undefined) =>
  value === undefined || value === '' ? null : typeof value === 'number' || /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value;

/**
 * Skeleton do Design System TaskGo (Etapa 7): a forma do conteúdo enquanto
 * ele carrega. Decorativo (`aria-hidden`); quem anuncia é o `tg-loading`.
 *
 *   <tg-skeleton width="62%" />                     uma linha de texto
 *   <tg-skeleton [lines]="3" />                     parágrafo, última linha curta
 *   <tg-skeleton shape="circle" size="56" />        avatar
 *   <tg-skeleton shape="rect" height="80" />        imagem, chip, bloco
 *
 * Cor `border-default`, pulso de opacidade de 1,6 s, parado com movimento
 * reduzido. Repita as medidas do conteúdo real, para a tela não pular.
 */
@Component({
  selector: 'tg-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': "'tg-skeleton tg-skeleton--' + shape()",
    'aria-hidden': 'true',
    '[style.width]': 'hostWidth()',
    '[style.--_h]': 'blockHeight()',
    '[style.--_r]': 'blockRadius()',
  },
  template: `
    @for (line of rows(); track $index) {
      <span class="tg-skeleton__bone" [style.width]="line"></span>
    }
  `,
  styleUrl: './tg-skeleton.component.scss',
})
export class TgSkeletonComponent {
  /** Forma: linha de texto (padrão), círculo ou bloco. */
  readonly shape = input<TgSkeletonShape>('text');
  /** Largura (px ou `%`). Texto e bloco: 100%. */
  readonly width = input<string | number>();
  /** Altura (px). Texto: 14; bloco: 80. */
  readonly height = input<string | number>();
  /** Diâmetro do círculo (px). Padrão: 48. */
  readonly size = input(48, { transform: numberAttribute });
  /** Linhas de texto. A última fica com 64% da largura. */
  readonly lines = input(1, { transform: numberAttribute });
  /** Raio do bloco. Texto usa `sm`; padrão do bloco: `lg`. */
  readonly radius = input<TgSkeletonRadius>();

  protected readonly hostWidth = computed(() =>
    this.shape() === 'circle' ? `${this.size()}px` : (size(this.width()) ?? '100%'),
  );
  protected readonly blockHeight = computed(() => {
    if (this.shape() === 'circle') return `${this.size()}px`;
    return size(this.height()) ?? (this.shape() === 'rect' ? '80px' : '14px');
  });
  protected readonly blockRadius = computed(() => {
    if (this.shape() === 'circle') return 'var(--tg-radius-full)';
    return `var(--tg-radius-${this.radius() ?? (this.shape() === 'rect' ? 'lg' : 'sm')})`;
  });
  protected readonly rows = computed(() => {
    const count = this.shape() === 'text' ? Math.max(1, Math.floor(this.lines())) : 1;
    return Array.from({ length: count }, (_, i) => (count > 1 && i === count - 1 ? '64%' : '100%'));
  });
}
