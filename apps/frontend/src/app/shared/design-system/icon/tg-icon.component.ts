import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TG_ICONS, type TgIconName, type TgIconWeight } from '@taskgo/icons';

/**
 * Ícone Phosphor. Decorativo por padrão (aria-hidden); com `label`, vira
 * imagem com nome acessível. A cor vem de `currentColor`.
 */
@Component({
  selector: 'tg-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // O svg inteiro vai no innerHTML do host: o DOM do SSR não implementa
  // innerHTML em elementos SVG, só em elementos HTML.
  host: { '[innerHTML]': 'markup()' },
  template: '',
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

  readonly #sanitizer = inject(DomSanitizer);

  // O conteúdo vem só do registro gerado a partir do pacote Phosphor, nunca de entrada externa;
  // o label é escapado antes de entrar no atributo.
  readonly markup = computed(() => {
    const size = this.size();
    const label = this.label();
    const a11y = label ? `role="img" aria-label="${escapeAttribute(label)}"` : 'aria-hidden="true"';
    return this.#sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" ` +
        `width="${size}" height="${size}" ${a11y} focusable="false">` +
        `${TG_ICONS[this.name()][this.weight()]}</svg>`,
    );
  });
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
