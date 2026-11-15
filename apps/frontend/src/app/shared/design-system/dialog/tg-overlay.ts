import { DOCUMENT } from '@angular/common';
import { Directive, ElementRef, OnDestroy, booleanAttribute, inject, input, output, signal, viewChild } from '@angular/core';

let nextId = 0;
let scrollLocks = 0;
let savedOverflow = '';
/**
 * Overlays abertos, do de baixo para o de cima. Interno e só para o foco:
 * saber se quem fecha está no topo e para onde o foco pode voltar.
 */
const openOverlays: TgOverlay[] = [];

/** Pode receber o foco agora: conectado, visível, habilitado e fora de inert. */
function canFocus(el: HTMLElement | null): el is HTMLElement {
  return (
    !!el &&
    el.isConnected &&
    el.tabIndex >= 0 &&
    !el.matches(':disabled') &&
    !el.closest('[inert]') &&
    (typeof el.checkVisibility !== 'function' || el.checkVisibility())
  );
}

/**
 * Comportamento comum de `tg-dialog` e `tg-sheet`, sobre o `dialog` nativo
 * com `showModal()`: foco preso dentro, fundo inerte, Esc e toque no fundo
 * fecham, a rolagem da página trava e o foco volta para quem abriu.
 *
 * Com `busy`, nada que a pessoa faça fecha (Esc, fundo, X); a tela ainda
 * pode fechar por código, quando o envio termina.
 *
 * Foco inicial: o alvo de `initialFocus()` (a ação segura no diálogo, o
 * Fechar no painel); se ele não puder receber foco, o próprio dialog
 * (tabindex -1), que o leitor anuncia com título e descrição. Não depende
 * da escolha do navegador, que pegaria o primeiro link do texto.
 *
 * Foco ao fechar: só quem está no topo devolve o foco, para quem o abriu,
 * se ainda puder recebê-lo e estiver no modal que sobra; senão, para o foco
 * inicial do modal que sobra. Se um overlay de baixo fecha (ou sai da tela)
 * antes, quem foi aberto de dentro dele herda o destino dele.
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

  /** Onde o foco começa; null usa o próprio dialog. */
  protected abstract initialFocus(): HTMLElement | null;

  open() {
    const dialog = this.dialog().nativeElement;
    if (this.isOpen() || typeof dialog.showModal !== 'function') return;
    this.#trigger = this.#document.activeElement as HTMLElement | null;
    dialog.showModal();
    this.#lockScroll();
    openOverlays.push(this);
    this.isOpen.set(true);
    this.#focusInitial();
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
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.#release();
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
    this.isOpen.set(false);
    this.#release();
    this.closed.emit();
  }

  #focusInitial() {
    const target = this.initialFocus();
    if (canFocus(target)) {
      target.focus();
      if (this.#document.activeElement === target) return;
    }
    this.dialog().nativeElement.focus();
  }

  /** Sai da pilha, destrava a rolagem e cuida do foco. Uma vez por abertura. */
  #release() {
    this.#unlockScroll();
    const index = openOverlays.indexOf(this);
    if (index < 0) return;
    const wasTop = index === openOverlays.length - 1;
    openOverlays.splice(index, 1);
    const trigger = this.#trigger;
    this.#trigger = null;

    // Quem foi aberto de dentro deste herda o destino dele.
    const dialog = this.dialog().nativeElement;
    for (const other of openOverlays) {
      if (other.#trigger && dialog.contains(other.#trigger)) other.#trigger = trigger;
    }
    if (!wasTop) return;

    const top = openOverlays[openOverlays.length - 1];
    const allowed = !top || top.dialog().nativeElement.contains(trigger);
    if (allowed && canFocus(trigger)) {
      trigger.focus();
      if (this.#document.activeElement === trigger) return;
    }
    if (top) top.#focusInitial();
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
