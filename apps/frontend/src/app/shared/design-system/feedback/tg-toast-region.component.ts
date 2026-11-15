import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  afterRenderEffect,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';
import { availableFeedbackFocus, FEEDBACK_FOCUSABLE } from './feedback-focus';
import { TgToast, TgToastItem } from './tg-toast.service';

/**
 * Onde os toasts aparecem. Vai uma vez no shell (fora de diálogos):
 *
 *   <tg-toast-region />
 *
 * Embaixo e centralizado, até 480 px; abaixo de 1024 px, com a barra de abas
 * na página, fica acima dela. A mensagem é anunciada por uma região
 * aria-live que já existe antes dela; o toast não rouba o foco. Some no
 * tempo do toast e pausa enquanto o mouse está em cima ou o foco está
 * dentro; Esc fecha quando o foco está nele.
 */
@Component({
  selector: 'tg-toast-region',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'tg-toast-region' },
  template: `
    <!-- Sempre presente: anuncia só a mensagem, uma vez por toast. -->
    <div class="tg-toast-region__live" role="status" aria-live="polite" aria-atomic="true">
      @for (item of announced(); track item.id) {
        <span>{{ item.message }}</span>
      }
    </div>
    @if (toast.current(); as item) {
      <div
        #box
        [class]="'tg-toast tg-toast--' + item.tone"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
        (focusin)="onFocusIn($event)"
        (focusout)="onFocusOut($event)"
        (keydown.escape)="close()"
      >
        <span class="tg-toast__icon"><tg-icon [name]="item.tone === 'success' ? 'check' : 'warning-circle'" [size]="20" /></span>
        <p class="tg-toast__message">{{ item.message }}</p>
        @if (item.action) {
          <button type="button" class="tg-toast__action" (click)="act(item)">{{ item.action }}</button>
        }
        <button type="button" class="tg-toast__close" aria-label="Fechar notificação" (click)="close()">
          <tg-icon name="x" [size]="20" />
        </button>
      </div>
    }
  `,
  styleUrl: './tg-toast-region.component.scss',
})
export class TgToastRegionComponent {
  protected readonly toast = inject(TgToast);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);
  readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  /** O que a região viva lê: o toast atual (cada novo toast troca o nó). */
  protected readonly announced = () => {
    const item = this.toast.current();
    return item ? [item] : [];
  };

  #timer: ReturnType<typeof setTimeout> | null = null;
  #itemId: number | undefined;
  #endsAt = 0;
  #remaining = 0;
  #hovered = false;
  #focused = false;
  /** Onde o foco estava antes de entrar no toast, para voltar ao fechar. */
  #returnTo: HTMLElement | null = null;

  constructor() {
    this.#destroyRef.onDestroy(() => this.#clear());
    effect(() => {
      const item = this.toast.current();
      this.#clear();
      this.#itemId = item?.id;
      this.#remaining = item?.duration ?? 0;
      if (!item) {
        this.#hovered = this.#focused = false;
        this.#returnTo = null;
      }
    });
    // Depois do patch do DOM: @if pode remover a ação, mas reutilizar a caixa
    // e o botão de fechar, sem emitir focusout/mouseleave.
    afterRenderEffect(() => {
      const item = this.toast.current();
      const box = this.box()?.nativeElement;
      if (!this.#browser || !item || !box) return;
      this.#focused = box.contains(this.#document.activeElement);
      this.#hovered = box.matches(':hover');
      if (!this.#focused) this.#returnTo = null;
      if (this.#focused || this.#hovered) this.#stop();
      else this.#start();
    });
  }

  protected pause() {
    this.#hovered = true;
    this.#stop();
  }

  protected resume() {
    this.#hovered = false;
    this.#start();
  }

  protected onFocusIn(event: FocusEvent) {
    const from = event.relatedTarget as HTMLElement | null;
    if (!from || !this.box()?.nativeElement.contains(from)) this.#returnTo = from;
    this.#focused = true;
    this.#stop();
  }

  protected onFocusOut(event: FocusEvent) {
    const to = event.relatedTarget as Node | null;
    if (to && this.box()?.nativeElement.contains(to)) return;
    this.#focused = false;
    this.#returnTo = null;
    this.#start();
  }

  protected act(item: TgToastItem) {
    item.onAction?.();
    if (this.toast.current()?.id === item.id) this.close();
  }

  /** Fecha o toast; se o foco estava nele, volta para onde estava antes. */
  close() {
    const box = this.box()?.nativeElement;
    const hadFocus = !!box && box.contains(this.#document.activeElement);
    const back = this.#returnTo;
    this.#returnTo = null;
    this.toast.dismiss();
    if (!hadFocus || !box) return;
    // Respeita o modal ativo; um controle conectado fora dele pode estar inerte
    // por causa do top layer do navegador, mesmo sem atributo inert.
    const modals = Array.from(this.#document.querySelectorAll<HTMLElement>(
      'dialog:modal, [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]',
    )).filter(availableFeedbackFocus);
    const scope = modals.at(-1) ?? this.#document.body;
    const usable = (el: HTMLElement) => scope.contains(el) && !box.contains(el) &&
      availableFeedbackFocus(el);
    if (back && back.matches(FEEDBACK_FOCUSABLE) && usable(back)) {
      back.focus();
      if (this.#document.activeElement === back) return;
    }
    const controls = Array.from(scope.querySelectorAll<HTMLElement>(FEEDBACK_FOCUSABLE))
      .filter((el) => el.tabIndex >= 0 && usable(el));
    const following = controls.filter((el) => box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
    const preceding = controls.filter((el) => box.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING).reverse();
    for (const target of [...following, ...preceding]) {
      target.focus();
      if (this.#document.activeElement === target) return;
    }
    // Página/modal sem controles: foco programático no marco, sem novo tab stop.
    const target = modals.at(-1) ?? Array.from(scope.querySelectorAll<HTMLElement>('main, [role="main"]'))
      .find(availableFeedbackFocus) ?? scope;
    if (!availableFeedbackFocus(target)) return;
    this.#focusFallback(target);
  }

  #focusFallback(target: HTMLElement) {
    const doc = target.ownerDocument;
    // Diálogos e marcos já focáveis não precisam de alteração no DOM.
    target.focus();
    if (doc.activeElement === target || target.hasAttribute('tabindex')) return;

    target.setAttribute('tabindex', '-1');
    let unregisterDestroy: (() => void) | null = null;
    let cleaned = false;
    const cleanup = (restore = true) => {
      if (cleaned) return;
      cleaned = true;
      // Inclui alterações externas ainda pendentes de entrega pelo observer,
      // mesmo uma nova atribuição de -1: nesse caso o atributo já não é nosso.
      const changed = observer.takeRecords().some((record) => record.type === 'attributes');
      observer.disconnect();
      target.removeEventListener('blur', onBlur);
      unregisterDestroy?.();
      unregisterDestroy = null;
      if (restore && !changed && target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
    };
    const onBlur = () => cleanup();
    const observe = () => {
      observer.observe(target, { attributes: true, attributeFilter: ['tabindex'] });
      // A remoção pode não emitir blur. Só acompanha os filhos diretos da
      // cadeia do alvo, sem observar subárvores nem gerenciar foco globalmente.
      for (let parent = target.parentNode; parent; parent = parent.parentNode) {
        observer.observe(parent, { childList: true });
      }
    };
    const observer = new MutationObserver((records) => {
      if ([...records, ...observer.takeRecords()].some((record) => record.type === 'attributes')) cleanup(false);
      else if (!target.isConnected || doc.activeElement !== target) cleanup();
      else { observer.disconnect(); observe(); }
    });
    observe();
    target.addEventListener('blur', onBlur, { once: true });
    unregisterDestroy = this.#destroyRef.onDestroy(() => {
      unregisterDestroy = null;
      // Remover tabindex enquanto o marco continua focado faz o Chrome
      // devolver o foco ao body. Nesse caso, o blur local conclui a limpeza.
      if (doc.activeElement !== target) cleanup();
    });
    target.focus();
    if (doc.activeElement !== target) cleanup();
  }

  #start() {
    if (!this.#browser || this.#timer || this.#hovered || this.#focused || this.toast.current()?.id !== this.#itemId || this.#itemId === undefined) return;
    this.#endsAt = Date.now() + this.#remaining;
    const id = this.#itemId;
    const timer = setTimeout(() => {
      if (this.#timer !== timer || this.toast.current()?.id !== id) return;
      this.#timer = null;
      this.toast.dismiss(id);
    }, this.#remaining);
    this.#timer = timer;
  }

  #stop() {
    if (!this.#timer) return;
    this.#remaining = Math.max(0, this.#endsAt - Date.now());
    this.#clear();
  }

  #clear() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
  }
}
