import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Relógio compartilhado para rótulos relativos de data ("Hoje", "Amanhã").
 *
 * Um só timer por aplicação, não um por card: no navegador, agenda a
 * próxima meia-noite local e atualiza o sinal `now`; quem lê o sinal num
 * `computed` se atualiza sozinho. No servidor (SSR) não agenda nada, para
 * não manter a aplicação instável nem depender de APIs do navegador; a
 * hidratação atualiza no cliente.
 */
@Injectable({ providedIn: 'root' })
export class TgClock {
  readonly #now = signal(new Date());
  /** A hora de referência, atualizada a cada virada de dia. */
  readonly now = this.#now.asReadonly();

  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    this.#schedule();
    inject(DestroyRef).onDestroy(() => {
      if (this.#timer !== null) clearTimeout(this.#timer);
    });
  }

  #schedule() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // Um segundo depois da meia-noite, para não cair no dia anterior por arredondamento.
    this.#timer = setTimeout(() => {
      this.#now.set(new Date());
      this.#schedule();
    }, midnight.getTime() - now.getTime() + 1000);
  }
}
