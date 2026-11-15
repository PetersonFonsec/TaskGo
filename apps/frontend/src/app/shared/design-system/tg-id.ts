import { Injectable, inject } from '@angular/core';

/**
 * Ids de DOM estáveis entre o servidor e o cliente (SSR com hidratação).
 *
 * O contador vive no injetor raiz da aplicação, não no módulo: no servidor
 * cada requisição cria uma aplicação nova e começa do zero, e o cliente
 * também. Renderizando a mesma tela na mesma ordem, os ids batem na
 * hidratação. Um contador no módulo continuaria crescendo entre requisições
 * no servidor.
 *
 *   readonly #ids = tgIds('tg-order-row');
 *   protected readonly titleId = this.#ids('title');   // tg-order-row-0-title
 */
@Injectable({ providedIn: 'root' })
export class TgIdGenerator {
  readonly #counters = new Map<string, number>();

  next(prefix: string): number {
    const n = this.#counters.get(prefix) ?? 0;
    this.#counters.set(prefix, n + 1);
    return n;
  }
}

/** Reserva um número para esta instância e devolve uma fábrica de ids com ele. Use num contexto de injeção. */
export function tgIds(prefix: string): (part: string) => string {
  const n = inject(TgIdGenerator).next(prefix);
  return (part) => `${prefix}-${n}-${part}`;
}
