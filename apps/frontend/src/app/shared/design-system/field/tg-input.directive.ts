import { DestroyRef, Directive, ElementRef, HostAttributeToken, effect, inject, signal, untracked } from '@angular/core';
import { idRefs } from '../button/accessible-name';
import { TgFieldComponent } from './tg-field.component';

let nextId = 0;

type SharedAttribute = 'aria-describedby' | 'aria-invalid';
const SHARED_ATTRIBUTES: SharedAttribute[] = ['aria-describedby', 'aria-invalid'];

/**
 * Marca o input ou textarea nativo de um `tg-field`. Liga o rótulo (id), a
 * dica e o erro (aria-describedby) e o estado inválido (aria-invalid).
 *
 * Contrato dos atributos que a tela e o campo dividem:
 * - `aria-describedby`: os ids da tela vêm primeiro, depois o da dica ou do
 *   erro do campo, sem repetição.
 * - `aria-invalid`: com erro visível no campo, vale "true"; sem erro, vale o
 *   valor mais recente da tela (ou nenhum).
 * A tela pode escrever por atributo estático, binding ou direto no DOM. Um
 * MutationObserver só no input e só nesses dois atributos separa as
 * escritas da tela das do campo: cada escrita do campo é contada, e o que
 * passar da conta é da tela. O campo só escreve quando o valor muda, então
 * não há laço.
 */
@Directive({
  selector: 'input[tgInput], textarea[tgInput]',
  host: {
    class: 'tg-input',
    '[id]': 'id()',
  },
})
export class TgInputDirective {
  protected readonly field = inject(TgFieldComponent, { optional: true });
  readonly element = inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement;

  readonly #ownId = inject(new HostAttributeToken('id'), { optional: true });
  readonly #generatedId = `tg-input-${nextId++}`;
  readonly id = () => this.#ownId || this.#generatedId;

  /** Último valor que a tela deu a cada atributo. */
  readonly #screen = {
    'aria-describedby': signal<string | null>(null),
    'aria-invalid': signal<string | null>(null),
  };
  readonly #pending = { 'aria-describedby': 0, 'aria-invalid': 0 };
  readonly #observer =
    typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.#absorb(records));

  constructor() {
    this.field?.register(this);

    for (const name of SHARED_ATTRIBUTES) this.#setScreen(name, this.element.getAttribute(name));
    this.#observer?.observe(this.element, {
      attributes: true,
      attributeFilter: SHARED_ATTRIBUTES,
      attributeOldValue: true,
    });
    inject(DestroyRef).onDestroy(() => this.#observer?.disconnect());

    effect(() => {
      // Lê o que a tela escreveu neste mesmo ciclo antes de compor.
      untracked(() => this.#absorb(this.#observer?.takeRecords() ?? []));
      this.#write('aria-describedby', this.#describedBy());
      this.#write('aria-invalid', this.field?.invalid() ? 'true' : this.#screen['aria-invalid']());
    });
  }

  #describedBy(): string | null {
    const own = this.field?.describedBy();
    const ids = [...new Set([...idRefs(this.#screen['aria-describedby']()), ...(own ? [own] : [])])];
    return ids.length ? ids.join(' ') : null;
  }

  #write(name: SharedAttribute, value: string | null) {
    if (this.element.getAttribute(name) === value) return;
    if (this.#observer) this.#pending[name]++;
    if (value === null) this.element.removeAttribute(name);
    else this.element.setAttribute(name, value);
  }

  #absorb(records: MutationRecord[]) {
    let changed = false;
    records.forEach((record, index) => {
      const name = record.attributeName as SharedAttribute;
      if (this.#pending[name] > 0) {
        this.#pending[name]--;
        return;
      }
      // Valor logo depois desta escrita: o oldValue da próxima do mesmo
      // atributo ou, se não houver, o valor atual.
      const next = records.slice(index + 1).find((r) => r.attributeName === name);
      this.#setScreen(name, next ? next.oldValue : this.element.getAttribute(name));
      changed = true;
    });
    if (changed) {
      this.#write('aria-describedby', untracked(() => this.#describedBy()));
      this.#write('aria-invalid', untracked(() => (this.field?.invalid() ? 'true' : this.#screen['aria-invalid']())));
    }
  }

  /** Guarda o valor da tela, sem os ids que são do próprio campo. */
  #setScreen(name: SharedAttribute, value: string | null) {
    if (name === 'aria-describedby' && value !== null) {
      const own = new Set([this.field?.hintId, this.field?.errorId]);
      const ids = idRefs(value).filter((id) => !own.has(id));
      value = ids.length ? ids.join(' ') : null;
    }
    this.#screen[name].set(value);
  }
}
