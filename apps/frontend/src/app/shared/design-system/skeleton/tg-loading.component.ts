import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Directive,
  PLATFORM_ID,
  TemplateRef,
  booleanAttribute,
  computed,
  contentChild,
  effect,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** O skeleton que o `tg-loading` mostra enquanto carrega. */
@Directive({ selector: 'ng-template[tgLoadingSkeleton]' })
export class TgLoadingSkeletonDirective {
  readonly template = inject(TemplateRef);
}

/**
 * Região que carrega (Etapa 7). Enquanto `loading`, fica com `aria-busy`
 * e, depois do atraso (300 ms), mostra o skeleton e anuncia o `label` uma
 * vez, de forma educada. Se os dados chegam antes, vai direto ao conteúdo.
 *
 *   <tg-loading label="Carregando pedidos" [loading]="carregando()">
 *     <ng-template tgLoadingSkeleton>
 *       @for (i of [1, 2, 3]; track i) { … card com tg-skeleton … }
 *     </ng-template>
 *     … conteúdo …
 *   </tg-loading>
 *
 * O conteúdo só entra no DOM quando `loading` é falso. Como todo
 * `ng-content`, ele é criado com a tela: componentes dentro dele iniciam
 * (`ngOnInit`) mesmo durante a carga, não são recriados ao alternar e
 * saem junto com a tela. Para iniciar só com os dados, use `@if` na tela.
 * Erro e vazio são da tela: alerta com "Tentar de novo" e estado vazio.
 */
@Component({
  selector: 'tg-loading',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'tg-loading' },
  template: `
    <span class="tg-loading__status" role="status">{{ showSkeleton() ? label() : '' }}</span>
    <!-- aria-busy fica no corpo, não na região viva, para não calar o anúncio. -->
    <div class="tg-loading__body" [attr.aria-busy]="loading() ? 'true' : null">
      @if (!loading()) {
        <ng-content />
      } @else if (showSkeleton()) {
        <div class="tg-loading__skeleton" aria-hidden="true">
          <ng-container [ngTemplateOutlet]="skeleton()?.template ?? null" />
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .tg-loading__status {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class TgLoadingComponent {
  /** O que o leitor de tela ouve, como "Carregando pedidos". */
  readonly label = input.required<string>();
  /** Os dados estão carregando. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Espera antes de mostrar o skeleton, em ms. Lida no início de cada carga. */
  readonly delay = input(300, { transform: numberAttribute });

  protected readonly skeleton = contentChild(TgLoadingSkeletonDirective);
  readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));
  /** A espera desta carga já passou. */
  readonly #waited = signal(false);
  // No servidor não há espera nem skeleton: a página sai sem ele e o
  // navegador decide depois da hidratação.
  protected readonly showSkeleton = computed(() => this.#browser && this.loading() && this.#waited());
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#clear());
    // Só `loading` dispara: mudar o `delay` no meio de uma carga vale para a
    // próxima, sem esconder o skeleton que já está na tela. O efeito roda na
    // detecção de mudanças do componente, antes do template, e cancela o
    // tempo da carga anterior; um tempo cancelado não chega a rodar.
    effect(() => {
      const loading = this.loading();
      const delay = untracked(this.delay);
      this.#clear();
      this.#waited.set(false);
      if (!loading || !this.#browser) return;
      if (!(delay > 0)) {
        this.#waited.set(true);
        return;
      }
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.#waited.set(true);
      }, delay);
    });
  }

  #clear() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
