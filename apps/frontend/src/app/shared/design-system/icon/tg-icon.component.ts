import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TG_ICONS, type TgIconName, type TgIconWeight } from '@taskgo/icons';

/**
 * Ícone Phosphor. Decorativo por padrão (aria-hidden); com `label`, vira
 * imagem com nome acessível. A cor vem de `currentColor`.
 */
@Component({
  selector: 'tg-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    [attr.width]="validSize()"
    [attr.height]="validSize()"
    [attr.role]="label() ? 'img' : null"
    [attr.aria-label]="label() || null"
    [attr.aria-hidden]="label() ? null : 'true'"
    focusable="false"
  >
    <path [attr.d]="pathData()" />
  </svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      line-height: 0;
    }
  `,
})
export class TgIconComponent {
  readonly name = input.required<TgIconName>();
  readonly weight = input<TgIconWeight>('regular');
  readonly size = input<16 | 20 | 24 | number>(20);
  readonly label = input('');

  // Só dados geométricos do pacote Phosphor entram no SVG; sem innerHTML, o ícone
  // também é renderizado pelo Angular no prerender do servidor.
  readonly pathData = computed(() => {
    const markup = TG_ICONS[this.name()][this.weight()];
    return /<path\s+d="([^"]+)"/.exec(markup)?.[1] ?? '';
  });

  /** Só números finitos e positivos viram largura e altura; o resto cai no tamanho padrão. */
  readonly validSize = computed(() => {
    const size: unknown = this.size();
    return typeof size === 'number' && Number.isFinite(size) && size > 0 ? size : DEFAULT_SIZE;
  });
}

const DEFAULT_SIZE = 20;
