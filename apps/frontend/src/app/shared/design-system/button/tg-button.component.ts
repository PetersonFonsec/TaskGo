import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import type { TgIconName } from '@taskgo/icons';
import { accessibleName, idRefs } from './accessible-name';
import { TgIconComponent } from '../icon/tg-icon.component';

export type TgButtonAppearance = 'solid' | 'subtle' | 'outline' | 'ghost';
export type TgButtonTone = 'brand' | 'danger';
export type TgButtonSize = 'sm' | 'md' | 'lg';

let nextId = 0;

/**
 * Botão do Design System TaskGo (Etapa 7).
 *
 * Aplicado sobre o elemento nativo para manter semântica, formulários e
 * routerLink: `<button tgButton>` ou `<a tgButton routerLink="…">`.
 * A cor vem do modo (cliente ou prestador), nunca do botão.
 */
@Component({
  selector: 'button[tgButton], a[tgButton]',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tg-button',
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
  },
  template: `
    @if (loading()) {
      <span class="tg-button__spinner" aria-hidden="true"></span>
      <!-- Fora do nome (hidden), mas lido como descrição via aria-describedby. -->
      <span [id]="statusId" hidden>Carregando</span>
    }
    <span class="tg-button__content" [class.tg-button__content--hidden]="loading()">
      @if (iconStart(); as icon) {
        <tg-icon [name]="icon" [size]="iconSize()" />
      }
      @if (!iconOnly()) {
        <span class="tg-button__label"><ng-content /></span>
      }
      @if (iconEnd(); as icon) {
        <tg-icon [name]="icon" [size]="iconSize()" />
      }
    </span>
  `,
  styleUrl: './tg-button.component.scss',
})
export class TgButtonComponent {
  readonly appearance = input<TgButtonAppearance>('solid');
  readonly tone = input<TgButtonTone>('brand');
  readonly size = input<TgButtonSize>('md');
  // booleanAttribute: aceita a sintaxe HTML (`loading`, `iconOnly="false"`) e binding.
  readonly loading = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly iconStart = input<TgIconName | undefined>(undefined);
  readonly iconEnd = input<TgIconName | undefined>(undefined);
  /** Botão só de ícone: use `iconStart` e o atributo nativo `aria-label`. */
  readonly iconOnly = input(false, { transform: booleanAttribute });

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #destroyRef = inject(DestroyRef);

  /** Id do texto "Carregando", ligado ao host por aria-describedby. */
  protected readonly statusId = `tg-button-status-${nextId++}`;

  readonly iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));

  readonly classes = computed(() =>
    [
      'tg-button',
      `tg-button--${this.appearance()}`,
      `tg-button--${this.tone()}`,
      `tg-button--${this.size()}`,
      this.fullWidth() ? 'tg-button--full' : '',
      this.iconOnly() ? 'tg-button--icon-only' : '',
      this.loading() ? 'tg-button--loading' : '',
    ]
      .filter(Boolean)
      .join(' '),
  );

  constructor() {
    // Carregando: o nome da ação não muda (o conteúdo só fica transparente).
    // O estado vai à parte: aria-busy, aria-disabled e a descrição
    // "Carregando" somada ao aria-describedby da tela (ver LoadingAttributes).
    let overlay: LoadingAttributes | null = null;
    effect(() => {
      if (this.loading() && !overlay) {
        overlay = new LoadingAttributes(this.#host.nativeElement, this.statusId);
      } else if (!this.loading() && overlay) {
        overlay.stop();
        overlay = null;
      }
    });
    this.#destroyRef.onDestroy(() => overlay?.stop());

    // Bloqueia só a ativação. Mouse, Enter e Espaço chegam como `click` (é o
    // que o navegador dispara ao ativar button e link), então teclado, foco e
    // Tab seguem livres. A fase de captura roda antes dos (click) e do
    // routerLink registrados no mesmo elemento.
    const el = this.#host.nativeElement;
    const block = (event: Event) => {
      if (!this.#isInteractionBlocked()) return;
      event.preventDefault(); // impede navegação do link e envio de formulário
      event.stopImmediatePropagation(); // impede os handlers da tela
    };
    el.addEventListener('click', block, true);
    this.#destroyRef.onDestroy(() => el.removeEventListener('click', block, true));

    // Só em desenvolvimento: o build de produção remove este bloco.
    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
      this.#warnWhenIconOnlyHasNoName();
    }
  }

  /**
   * Avisa quando `iconOnly` fica sem nome acessível (ver accessibleName).
   * Reavalia quando `iconOnly` muda (signal), quando `aria-label`,
   * `aria-labelledby` ou `title` do próprio host mudam, e quando muda o
   * conteúdo dos alvos atuais do `aria-labelledby`. Os alvos só são
   * observados com `iconOnly` ativo e trocam quando a lista de ids muda.
   * Avisa uma vez por entrada no estado inválido.
   */
  #warnWhenIconOnlyHasNoName() {
    const el = this.#host.nativeElement;
    let warned = false;
    let refsObserver: MutationObserver | null = null;
    let observedRefs: string | null = null;
    const observeRefs = () => {
      const ids = this.iconOnly() ? (el.getAttribute('aria-labelledby') ?? '') : '';
      if (!refsObserver || ids === observedRefs) return;
      observedRefs = ids;
      refsObserver.disconnect();
      const root = el.getRootNode() as Document | ShadowRoot;
      for (const id of idRefs(ids)) {
        const ref = root.getElementById?.(id);
        if (ref) refsObserver.observe(ref, REF_OBSERVER_OPTIONS);
      }
    };
    const check = () => {
      observeRefs();
      const invalid = this.iconOnly() && accessibleName(el) === '';
      if (invalid && !warned) {
        console.warn('tgButton: botão só de ícone precisa de nome acessível (aria-label ou aria-labelledby com texto).', el);
      }
      warned = invalid;
    };

    afterRenderEffect(check);
    afterNextRender(() => {
      const observer = new MutationObserver(check);
      observer.observe(el, { attributes: true, attributeFilter: ['aria-label', 'aria-labelledby', 'title'] });
      refsObserver = new MutationObserver(check);
      this.#destroyRef.onDestroy(() => {
        observer.disconnect();
        refsObserver?.disconnect();
      });
      check();
    });
  }

  /**
   * Indisponível sem `disabled` nativo: carregando ou `aria-disabled="true"`
   * posto pela tela. O `disabled` nativo já não dispara `click`, então fica
   * com o navegador.
   */
  #isInteractionBlocked(): boolean {
    return this.loading() || this.#host.nativeElement.getAttribute('aria-disabled') === 'true';
  }
}

/** O que muda o texto de um alvo de aria-labelledby (ver accessibleName). */
const REF_OBSERVER_OPTIONS: MutationObserverInit = {
  subtree: true,
  childList: true,
  characterData: true,
  attributes: true,
  attributeFilter: ['aria-label', 'aria-hidden', 'hidden', 'alt', 'title', 'style', 'class'],
};

type SharedAttribute = 'aria-disabled' | 'aria-describedby';
const SHARED_ATTRIBUTES: SharedAttribute[] = ['aria-disabled', 'aria-describedby'];

/**
 * Atributos que a tela e o botão dividem enquanto ele carrega.
 *
 * Contrato: `aria-disabled` e `aria-describedby` são da tela. Durante o
 * carregamento, o botão sobrepõe `aria-disabled="true"` e soma o id da sua
 * descrição ao fim do `aria-describedby`. O que a tela escrever nesse meio
 * tempo (binding ou DOM) vira o novo valor dela, e a sobreposição é
 * reaplicada. Ao terminar, cada atributo fica com o último valor da tela.
 *
 * Como separar as escritas: um MutationObserver só no host, só nesses dois
 * atributos e só enquanto carrega. Cada escrita do botão é contada; registro
 * além da conta é da tela. O botão só escreve quando o valor muda, então não
 * há laço. No fim, `takeRecords()` lê o que a tela escreveu no mesmo ciclo.
 */
class LoadingAttributes {
  readonly #screen = new Map<SharedAttribute, string | null>();
  readonly #pending = new Map<SharedAttribute, number>();
  readonly #observer =
    typeof MutationObserver === 'undefined' ? null : new MutationObserver((records) => this.#absorb(records));

  constructor(
    private readonly el: HTMLElement,
    private readonly statusId: string,
  ) {
    for (const name of SHARED_ATTRIBUTES) this.#screen.set(name, this.#withoutOwn(name, el.getAttribute(name)));
    this.#observer?.observe(el, { attributes: true, attributeFilter: SHARED_ATTRIBUTES, attributeOldValue: true });
    for (const name of SHARED_ATTRIBUTES) this.#write(name, this.#overlaid(name));
  }

  stop() {
    if (this.#observer) {
      this.#absorb(this.#observer.takeRecords());
      this.#observer.disconnect();
    }
    for (const name of SHARED_ATTRIBUTES) setAttribute(this.el, name, this.#screen.get(name) ?? null);
  }

  #overlaid(name: SharedAttribute): string {
    if (name === 'aria-disabled') return 'true';
    return [...idRefs(this.#screen.get(name) ?? null), this.statusId].join(' ');
  }

  #write(name: SharedAttribute, value: string) {
    if (this.el.getAttribute(name) === value) return;
    if (this.#observer) this.#pending.set(name, (this.#pending.get(name) ?? 0) + 1);
    setAttribute(this.el, name, value);
  }

  #absorb(records: MutationRecord[]) {
    const changed = new Set<SharedAttribute>();
    records.forEach((record, index) => {
      const name = record.attributeName as SharedAttribute;
      const pending = this.#pending.get(name) ?? 0;
      if (pending > 0) {
        this.#pending.set(name, pending - 1);
        return;
      }
      // Valor logo depois desta escrita: o oldValue da próxima do mesmo
      // atributo ou, se não houver, o valor atual.
      const next = records.slice(index + 1).find((r) => r.attributeName === name);
      const value = next ? next.oldValue : this.el.getAttribute(name);
      this.#screen.set(name, this.#withoutOwn(name, value));
      changed.add(name);
    });
    for (const name of changed) this.#write(name, this.#overlaid(name));
  }

  /** Tira o id do botão, caso a tela tenha copiado o valor sobreposto. */
  #withoutOwn(name: SharedAttribute, value: string | null): string | null {
    if (name !== 'aria-describedby' || value === null) return value;
    const ids = [...new Set(idRefs(value).filter((id) => id !== this.statusId))];
    return ids.length ? ids.join(' ') : null;
  }
}

function setAttribute(el: HTMLElement, name: string, value: string | null) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}
