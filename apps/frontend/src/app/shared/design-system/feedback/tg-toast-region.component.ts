import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewEncapsulation,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { TgIconComponent } from '../icon/tg-icon.component';
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
  readonly #browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly box = viewChild<ElementRef<HTMLElement>>('box');

  /** O que a região viva lê: o toast atual (cada novo toast troca o nó). */
  protected readonly announced = () => {
    const item = this.toast.current();
    return item ? [item] : [];
  };

  #timer: ReturnType<typeof setTimeout> | null = null;
  #endsAt = 0;
  #remaining = 0;
  #hovered = false;
  #focused = false;
  /** Onde o foco estava antes de entrar no toast, para voltar ao fechar. */
  #returnTo: HTMLElement | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#clear());
    effect(() => {
      const item = this.toast.current();
      this.#clear();
      // Sem toast, o elemento sai sem mouseleave/focusout. Com um novo toast
      // no lugar do anterior, o elemento é o mesmo: mouse e foco continuam.
      if (!item) {
        this.#hovered = this.#focused = false;
        return;
      }
      if (!this.#browser) return;
      this.#remaining = item.duration;
      this.#start();
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
    if (!this.#focused && from && !this.box()?.nativeElement.contains(from)) this.#returnTo = from;
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
    this.close();
  }

  /** Fecha o toast; se o foco estava nele, volta para onde estava antes. */
  close() {
    const box = this.box()?.nativeElement;
    const hadFocus = !!box && box.contains(this.#document.activeElement);
    const back = this.#returnTo;
    this.#returnTo = null;
    this.toast.dismiss();
    if (hadFocus && back?.isConnected) back.focus();
  }

  #start() {
    if (!this.#browser || this.#timer || this.#hovered || this.#focused || !this.toast.current()) return;
    this.#endsAt = Date.now() + this.#remaining;
    const id = this.toast.current()?.id;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      this.toast.dismiss(id);
    }, this.#remaining);
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
