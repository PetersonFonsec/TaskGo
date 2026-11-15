import { Directive, ElementRef, HostAttributeToken, computed, inject } from '@angular/core';
import { TgFieldComponent } from './tg-field.component';

let nextId = 0;

/**
 * Marca o input ou textarea nativo de um `tg-field`. Liga o rótulo (id),
 * a dica e o erro (aria-describedby) e o estado inválido (aria-invalid).
 * Um `id` ou `aria-describedby` estático posto pela tela é mantido.
 */
@Directive({
  selector: 'input[tgInput], textarea[tgInput]',
  host: {
    class: 'tg-input',
    '[id]': 'id()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': "field?.invalid() ? 'true' : null",
  },
})
export class TgInputDirective {
  protected readonly field = inject(TgFieldComponent, { optional: true });
  readonly element = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  readonly #ownId = inject(new HostAttributeToken('id'), { optional: true });
  readonly #ownDescribedBy = inject(new HostAttributeToken('aria-describedby'), { optional: true });
  readonly #generatedId = `tg-input-${nextId++}`;

  readonly id = () => this.#ownId || this.#generatedId;

  readonly describedBy = computed(() => {
    const ids = [this.#ownDescribedBy, this.field?.describedBy()].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  });

  constructor() {
    this.field?.register(this);
  }
}
