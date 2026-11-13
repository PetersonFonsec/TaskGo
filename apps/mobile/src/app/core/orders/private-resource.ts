import { computed, DestroyRef, inject, Signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { RefresherCustomEvent } from '@ionic/angular';
import {
  catchError,
  combineLatest,
  finalize,
  identity,
  map,
  merge,
  Observable,
  of,
  startWith,
  Subject,
  switchMap
} from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';

export type ResourceState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly value: T };

export interface PrivateResource<T> {
  /** Estado da sessão atual; dados de outra sessão nunca aparecem aqui. */
  readonly state: Signal<ResourceState<T>>;
  /** Puxar para atualizar: cada evento é encerrado exatamente uma vez. */
  refresh(event: RefresherCustomEvent): void;
  /** Recarrega mantendo o que está na tela (ex.: ao voltar para a página). */
  reload(): void;
  /** Encerra os refreshers pendentes (ex.: ao sair da página). */
  cancelRefreshes(): void;
}

interface Tagged<T> {
  readonly session: number;
  readonly state: ResourceState<T>;
}

/**
 * Dados da conta logada, presos à sessão em que foram buscados. Login, logout,
 * troca de conta ou perda da sessão cancelam a busca em andamento e escondem na
 * hora o que foi carregado antes; respostas atrasadas de outra sessão são
 * descartadas. Precisa rodar num contexto de injeção (construtor da página).
 */
export function privateResource<K, T>(
  key: Signal<K>,
  fetch: (key: K) => Observable<T>
): PrivateResource<T> {
  const auth = inject(AuthService);
  const pending = new Set<RefresherCustomEvent>();
  const again = new Subject<RefresherCustomEvent | null>();

  const finish = (event: RefresherCustomEvent) => {
    if (!pending.delete(event)) return;
    try {
      void Promise.resolve(event.target.complete()).catch(() => undefined);
    } catch {
      // Elemento já removido da tela: nada a encerrar.
    }
  };
  const cancelRefreshes = () => [...pending].forEach(finish);
  inject(DestroyRef).onDestroy(cancelRefreshes);

  // `undefined` = carga nova (mostra carregando); `null` ou evento = atualização.
  const firstLoads = combineLatest([toObservable(auth.session), toObservable(key)]).pipe(
    map(([session, k]) => ({ session, k, refresh: undefined as RefresherCustomEvent | null | undefined }))
  );
  const reloads = again.pipe(
    map((refresh) => ({ session: untracked(auth.session), k: untracked(key), refresh }))
  );

  const raw = toSignal(
    merge(firstLoads, reloads).pipe(
      switchMap(({ session, k, refresh }): Observable<Tagged<T>> => {
        if (!untracked(auth.isAuthenticated)) {
          if (refresh) finish(refresh);
          return of({ session, state: { status: 'idle' } });
        }
        return fetch(k).pipe(
          map((value): Tagged<T> => ({ session, state: { status: 'ready', value } })),
          catchError(() => of<Tagged<T>>({ session, state: { status: 'error' } })),
          refresh === undefined
            ? startWith<Tagged<T>>({ session, state: { status: 'loading' } })
            : identity,
          // Sucesso, erro ou cancelamento (nova busca, troca de sessão, destruição).
          finalize(() => refresh && finish(refresh))
        );
      })
    ),
    { initialValue: { session: -1, state: { status: 'loading' } } as Tagged<T> }
  );

  const state = computed((): ResourceState<T> => {
    const current = raw();
    if (current.session === auth.session()) return current.state;
    return auth.isAuthenticated() ? { status: 'loading' } : { status: 'idle' };
  });

  return {
    state,
    refresh(event) {
      pending.add(event);
      again.next(event);
    },
    reload() {
      again.next(null);
    },
    cancelRefreshes
  };
}
