import { Injectable, signal } from '@angular/core';

/** Toast é só para ação concluída ou informação passageira. Erro é alerta. */
export type TgToastTone = 'success' | 'info';

export interface TgToastOptions {
  tone?: TgToastTone;
  /** Ação curta, como "Desfazer". */
  action?: string;
  onAction?: () => void;
  /** Em ms. Padrão: 6 s, ou 10 s com ação. Nunca menos de 6 s. */
  duration?: number;
}

export interface TgToastItem {
  readonly id: number;
  readonly message: string;
  readonly tone: TgToastTone;
  readonly action?: string;
  readonly onAction?: () => void;
  readonly duration: number;
}

export interface TgToastRef {
  dismiss(): void;
}

const MIN_DURATION = 6000;

/**
 * Toasts do Design System TaskGo (Etapa 7). Um por vez: o novo substitui o
 * anterior. Mostrado pela `tg-toast-region`, que fica uma vez no shell.
 *
 *   inject(TgToast).show('Endereço salvo.');
 *   inject(TgToast).show('Pedido cancelado.', { action: 'Desfazer', onAction: () => desfazer() });
 */
@Injectable({ providedIn: 'root' })
export class TgToast {
  #nextId = 0;
  readonly #current = signal<TgToastItem | null>(null);
  /** O toast na tela, se houver. */
  readonly current = this.#current.asReadonly();

  show(message: string, options: TgToastOptions = {}): TgToastRef {
    const base = options.action ? 10000 : MIN_DURATION;
    const item: TgToastItem = {
      id: ++this.#nextId,
      message,
      tone: options.tone ?? 'success',
      action: options.action,
      onAction: options.onAction,
      duration: Math.max(MIN_DURATION, options.duration ?? base),
    };
    this.#current.set(item);
    return { dismiss: () => this.dismiss(item.id) };
  }

  /** Fecha o toast atual, ou só aquele id se ele ainda estiver na tela. */
  dismiss(id?: number) {
    const current = this.#current();
    if (current && (id === undefined || current.id === id)) this.#current.set(null);
  }
}
