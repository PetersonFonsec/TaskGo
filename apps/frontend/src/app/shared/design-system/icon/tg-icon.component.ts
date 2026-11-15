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
  template: `<svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    fill="currentColor"
    [attr.width]="size()"
    [attr.height]="size()"
    [attr.role]="label() ? 'img' : null"
    [attr.aria-label]="label() || null"
    [attr.aria-hidden]="label() ? null : 'true'"
    focusable="false"
    [innerHTML]="markup()"
  ></svg>`,
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

  // O conteúdo vem só do registro gerado a partir do pacote Phosphor, nunca de entrada externa.
  readonly markup = computed(() =>
    this.#sanitizer.bypassSecurityTrustHtml(TG_ICONS[this.name()][this.weight()]),
  );
}
