import { ChangeDetectionStrategy, Component, computed, input, numberAttribute } from '@angular/core';

export type TgSkeletonShape = 'text' | 'circle' | 'rect';
export type TgSkeletonRadius = 'sm' | 'md' | 'lg' | 'xl' | 'full';

/** Mais que isso não cabe numa primeira tela. */
const MAX_LINES = 20;

/**
 * Número (ou texto só com número) vira px, se for finito e não negativo;
 * senão, `null` (vale o padrão). Outro texto, como `62%` ou `5rem`, vai
 * como está.
 */
function length(value: string | number | undefined): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text === '') return null;
  if (typeof value === 'number' || /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(text) || /^[-+]?infinity$|^nan$/i.test(text)) {
    const n = Number(text);
    return Number.isFinite(n) && n >= 0 ? `${n}px` : null;
  }
  return text;
}

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
  /** Diâmetro do círculo (px). Padrão: 48; valor inválido também vira 48. */
  readonly size = input(48, { transform: numberAttribute });
  /** Linhas de texto, de 1 a 20. A última fica com 64% da largura. */
  readonly lines = input(1, { transform: numberAttribute });
  /** Raio do bloco. Texto usa `sm`; padrão do bloco: `lg`. */
  readonly radius = input<TgSkeletonRadius>();

  readonly #diameter = computed(() => {
    const size = this.size();
    return Number.isFinite(size) && size > 0 ? `${size}px` : '48px';
  });
  protected readonly hostWidth = computed(() =>
    this.shape() === 'circle' ? this.#diameter() : (length(this.width()) ?? '100%'),
  );
  protected readonly blockHeight = computed(() => {
    if (this.shape() === 'circle') return this.#diameter();
    return length(this.height()) ?? (this.shape() === 'rect' ? '80px' : '14px');
  });
  protected readonly blockRadius = computed(() => {
    if (this.shape() === 'circle') return 'var(--tg-radius-full)';
    return `var(--tg-radius-${this.radius() ?? (this.shape() === 'rect' ? 'lg' : 'sm')})`;
  });
  protected readonly rows = computed(() => {
    const lines = Math.floor(this.lines());
    const count = this.shape() !== 'text' || !Number.isFinite(lines) ? 1 : Math.min(MAX_LINES, Math.max(1, lines));
    return Array.from({ length: count }, (_, i) => (count > 1 && i === count - 1 ? '64%' : '100%'));
  });
}
