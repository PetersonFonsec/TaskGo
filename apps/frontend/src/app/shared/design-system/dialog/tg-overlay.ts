import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, booleanAttribute, inject, input, output, signal, viewChild } from '@angular/core';

let nextId = 0;
let scrollLocks = 0;
let savedOverflow = '';

/**
 * Comportamento comum de `tg-dialog` e `tg-sheet`, sobre o `dialog` nativo
 * com `showModal()`: foco preso dentro, fundo inerte, Esc e toque no fundo
 * fecham, a rolagem da página trava e o foco volta para quem abriu.
 *
 * Com `busy`, nada que a pessoa faça fecha (Esc, fundo, X); a tela ainda
 * pode fechar por código, quando o envio termina.
 */
@Directive()
export abstract class TgOverlay implements OnDestroy {
  /** Título visível; também é o nome do diálogo. */
  readonly title = input.required<string>();
  /** Envio em andamento: Esc, fundo e o X não fecham. */
  readonly busy = input(false, { transform: booleanAttribute });
  /** Abriu. */
  readonly opened = output<void>();
  /** Fechou, por qualquer caminho. */
  readonly closed = output<void>();

  readonly isOpen = signal(false);
  protected readonly titleId = `tg-overlay-title-${nextId}`;
  protected readonly bodyId = `tg-overlay-body-${nextId++}`;
  protected readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly #document = inject(DOCUMENT);
  #trigger: HTMLElement | null = null;

  open() {
    const dialog = this.dialog().nativeElement;
    if (this.isOpen() || typeof dialog.showModal !== 'function') return;
    this.#trigger = this.#document.activeElement as HTMLElement | null;
    dialog.showModal();
    this.#lockScroll();
    this.isOpen.set(true);
    this.opened.emit();
  }

  /** Fecha sempre, mesmo durante o envio. Para a tela usar por código. */
  close() {
    const dialog = this.dialog().nativeElement;
    if (dialog.open) dialog.close();
    this.onClose();
  }

  /** Pedido de fechar vindo da pessoa (X, Esc, fundo). */
  requestClose() {
    if (!this.busy()) this.close();
  }

  ngOnDestroy() {
    if (this.isOpen()) this.#unlockScroll();
  }

  // O Esc é tratado no keydown: impedir só o `cancel` não basta, porque o
  // Chrome fecha mesmo assim no segundo Esc seguido.
  protected onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.requestClose();
  }

  protected onCancel(event: Event) {
    event.preventDefault();
    this.requestClose();
  }

  /** Clique no fundo: o alvo é o próprio dialog, fora da caixa. */
  protected onClick(event: MouseEvent) {
    const dialog = this.dialog().nativeElement;
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    if (outside) this.requestClose();
  }

  protected onClose() {
    // O evento close nativo chega depois; se já reabriu, é de outro ciclo.
    if (!this.isOpen() || this.dialog().nativeElement.open) return;
    this.#unlockScroll();
    this.isOpen.set(false);
    const trigger = this.#trigger;
    this.#trigger = null;
    if (trigger?.isConnected) trigger.focus();
    this.closed.emit();
  }

  #lockScroll() {
    const body = this.#document.body;
    if (scrollLocks++ === 0) {
      savedOverflow = body.style.overflow;
      body.style.overflow = 'hidden';
    }
  }

  #unlockScroll() {
    if (scrollLocks > 0 && --scrollLocks === 0) this.#document.body.style.overflow = savedOverflow;
  }
}
