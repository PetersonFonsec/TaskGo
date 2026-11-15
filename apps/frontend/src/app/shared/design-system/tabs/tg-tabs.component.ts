import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  contentChildren,
  inject,
  input,
  isDevMode,
  model,
  signal,
  viewChild,
} from '@angular/core';

let nextId = 0;

/**
 * Uma aba de `tg-tabs`. O próprio elemento é o painel (`role="tabpanel"`):
 * o conteúdo fica dentro dele e só aparece quando a aba está selecionada.
 */
@Component({
  selector: 'tg-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'tg-tab',
    role: 'tabpanel',
    tabindex: '0',
    '[id]': 'panelId',
    '[attr.aria-labelledby]': 'tabId',
    '[hidden]': '!selected()',
  },
  template: '<ng-content />',
  styles: `
    :host {
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    :host(:focus-visible) {
      outline: 2px solid var(--tg-focus-ring);
      outline-offset: 2px;
      border-radius: var(--tg-radius-md);
    }
  `,
})
export class TgTabComponent {
  // Obrigatórios na prática, mas não `input.required`: as abas leem o valor
  // umas das outras, e numa lista (@for) a seguinte ainda não recebeu as
  // entradas quando a anterior é desenhada. Em desenvolvimento, falta avisa.
  /** Valor da aba, o mesmo que `tg-tabs` recebe em `value`. Obrigatório. */
  readonly value = input<string>();
  /** Rótulo curto e sempre visível. Obrigatório. */
  readonly label = input('');
  /** Contagem opcional, só quando ajuda a decidir. Zero ou vazio não aparece. */
  readonly count = input<number | null | undefined>(undefined);

  readonly #tabs = inject(TgTabsComponent);
  readonly tabId = `tg-tab-${nextId}`;
  readonly panelId = `tg-tab-panel-${nextId++}`;
  readonly selected = computed(() => this.#tabs.selected() === this);
  readonly hasCount = computed(() => {
    const count = this.count();
    return typeof count === 'number' && count > 0;
  });
  /**
   * Nome da aba: o rótulo e, se houver, a contagem ("Solicitações, 3"). Vai
   * em aria-label porque o Chrome põe espaço entre os pedaços do conteúdo
   * ("Solicitações , 3"); começa pelo texto visível, para o comando de voz.
   */
  readonly name = computed(() => (this.hasCount() ? `${this.label()}, ${this.count()}` : this.label()));
}

/**
 * Abas do Design System TaskGo (Etapa 7): trocam seções de conteúdo da mesma
 * tela, como pedidos ativos e concluídos.
 *
 *   <tg-tabs label="Pedidos" [(value)]="aba">
 *     <tg-tab value="ativos" label="Ativos" [count]="2">…</tg-tab>
 *     <tg-tab value="concluidos" label="Concluídos">…</tg-tab>
 *   </tg-tabs>
 *
 * Segue o padrão de abas da WAI-ARIA, com ativação automática: só a aba
 * selecionada entra no Tab; setas trocam de aba (com volta no fim), Home e
 * End vão às pontas. Sem valor (ou com um que não existe), vale a primeira.
 * Escolher um valor (dia, período, tipo de conta) não é aba: é rádio ou chip.
 */
@Component({
  selector: 'tg-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tg-tabs' },
  template: `
    <div class="tg-tabs__bar" [class.tg-tabs__bar--fade-start]="fadeStart()" [class.tg-tabs__bar--fade-end]="fadeEnd()">
      <div #list class="tg-tabs__list" role="tablist" [attr.aria-label]="label()" (keydown)="onKeydown($event)" (scroll)="measure()">
        @for (tab of tabs(); track tab) {
          <button
            type="button"
            role="tab"
            class="tg-tabs__tab"
            [id]="tab.tabId"
            [attr.aria-controls]="tab.panelId"
            [attr.aria-selected]="tab.selected()"
            [attr.aria-label]="tab.name()"
            [tabIndex]="tab.selected() ? 0 : -1"
            (click)="select(tab)"
          >
            <span class="tg-tabs__label" [attr.data-label]="tab.label()">{{ tab.label() }}</span>
            @if (tab.hasCount()) {
              <span class="tg-tabs__count">{{ tab.count() }}</span>
            }
          </button>
        }
      </div>
    </div>
    <ng-content />
  `,
  styleUrl: './tg-tabs.component.scss',
})
export class TgTabsComponent {
  /** Nome do conjunto de abas para o leitor de tela, como "Pedidos". */
  readonly label = input.required<string>();
  /** Valor da aba selecionada; muda quando a pessoa troca de aba. */
  readonly value = model<string | undefined>(undefined);

  readonly tabs = contentChildren(TgTabComponent);
  readonly selected = computed(() => {
    const tabs = this.tabs();
    const value = this.value();
    return (value !== undefined && tabs.find((tab) => tab.value() === value)) || tabs[0] || null;
  });

  /** Esmaecido nas bordas quando a barra rola na horizontal. */
  protected readonly fadeStart = signal(false);
  protected readonly fadeEnd = signal(false);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    // A aba selecionada fica sempre visível, e o esmaecido acompanha rótulos
    // e contagens. Só no navegador.
    // Depois do render, quando as abas já têm as entradas.
    afterRenderEffect(() => {
      const selected = this.selected();
      this.tabs().forEach((tab) => (tab.label(), tab.count()));
      this.#reveal(selected);
      this.measure();
    });

    if (isDevMode()) {
      afterRenderEffect(() => {
        const tabs = this.tabs();
        if (tabs.some((tab) => !tab.value() || !tab.label().trim())) {
          console.warn('tg-tabs: toda tg-tab precisa de value e label.');
        }
        const values = tabs.map((tab) => tab.value());
        const repeated = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
        if (repeated.length) console.warn(`tg-tabs: valores repetidos (${repeated.join(', ')}).`);
      });
    }

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(this.list().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  select(tab: TgTabComponent) {
    const value = tab.value();
    if (value !== undefined) this.value.set(value);
  }

  protected onKeydown(event: KeyboardEvent) {
    const tabs = this.tabs();
    const current = tabs.findIndex((tab) => tab.tabId === (event.target as HTMLElement).id);
    if (current < 0) return;
    const last = tabs.length - 1;
    const next =
      event.key === 'ArrowRight' ? (current === last ? 0 : current + 1)
      : event.key === 'ArrowLeft' ? (current === 0 ? last : current - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : -1;
    if (next < 0) return;
    event.preventDefault();
    this.select(tabs[next]);
    this.#button(tabs[next])?.focus();
  }

  protected measure() {
    const list = this.list().nativeElement;
    this.fadeStart.set(list.scrollLeft > 1);
    this.fadeEnd.set(list.scrollLeft + list.clientWidth < list.scrollWidth - 1);
  }

  #button(tab: TgTabComponent | null) {
    return tab ? this.list().nativeElement.querySelector<HTMLElement>(`#${tab.tabId}`) : null;
  }

  /** Rola só a barra (nunca a página) até a aba aparecer inteira. */
  #reveal(tab: TgTabComponent | null) {
    const button = this.#button(tab);
    if (!button) return;
    const list = this.list().nativeElement;
    const start = button.offsetLeft - list.offsetLeft;
    const end = start + button.offsetWidth;
    // Deixa à vista um pedaço da vizinha, além do esmaecido.
    const margin = 40;
    if (start - margin < list.scrollLeft) list.scrollLeft = Math.max(0, start - margin);
    else if (end + margin > list.scrollLeft + list.clientWidth) list.scrollLeft = end + margin - list.clientWidth;
  }
}
