import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, EMPTY, map, of, startWith, Subject, type Subscription, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import { sessionUserId } from '@shared/guards/session-user/session-user.guard';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgProviderCardComponent } from '@shared/design-system/provider-card/tg-provider-card.component';
import { type TgProvider, toTgProvider } from '@shared/design-system/provider-card/tg-provider';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';

/**
 * Favoritos do cliente (Etapa 10): os profissionais salvos, com o card de
 * prestador do Design System. Tirar o coração tira dos favoritos, mas o
 * card fica na tela (com o coração vazio) até a pessoa sair, para desfazer
 * com outro toque.
 */
@Component({
  selector: 'app-favorites',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgProviderCardComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Favorites {
  readonly #provider = inject(Provider);
  readonly #session = inject(UserLoggedService);

  readonly favoritesEnabled = environment.features?.favoritesMvp ?? false;
  readonly searchLink = '/customer/search';

  /** Id de quem está na sessão; muda com outra conta ou logout. */
  readonly #clientId = computed(() => sessionUserId(this.#session.user()));

  /** Os profissionais carregados, na ordem da API (o favorito mais recente primeiro). */
  readonly providers = signal<TgProvider[]>([]);
  /** Quantos favoritos a conta tem (a API pode mandar só os mais recentes). */
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal(false);

  /** Estado do coração por profissional: true favorito, false tirado nesta visita. */
  readonly favorite = signal<Readonly<Record<string, boolean>>>({});
  /** Profissionais com a troca do coração em curso. */
  readonly busy = signal<ReadonlySet<string>>(new Set());
  readonly actionError = signal('');

  /**
   * Quantos favoritos a conta tem agora: o `total` da API menos os tirados
   * nesta visita. A lista pode trazer só os mais recentes, então a contagem
   * não sai dos cards carregados.
   */
  readonly favoriteCount = computed(() => {
    const favorite = this.favorite();
    const removed = this.providers().filter((p) => favorite[p.id] === false).length;
    return Math.max(0, this.total() - removed);
  });
  readonly summary = computed(() => {
    const count = this.favoriteCount();
    const shown = `${count} ${count === 1 ? 'profissional salvo' : 'profissionais salvos'}`;
    return this.total() > this.providers().length ? `${shown} · mostrando os ${this.providers().length} mais recentes` : shown;
  });

  readonly #loads = new Subject<void>();
  readonly #requests = new Map<string, Subscription>();

  constructor() {
    // Uma carga por sessão: outra conta ou logout cancelam a consulta e as
    // trocas em curso e limpam a lista na hora.
    toObservable(this.#clientId)
      .pipe(
        switchMap((clientId) => {
          this.#reset();
          if (!this.favoritesEnabled) {
            this.loading.set(false);
            return EMPTY;
          }
          if (!clientId) {
            this.error.set(true);
            this.loading.set(false);
            return EMPTY;
          }
          return this.#loads.pipe(
            startWith(undefined),
            switchMap(() => {
              this.loading.set(true);
              this.error.set(false);
              return this.#provider.listFavorites(clientId).pipe(
                map((response: unknown) => ({ ok: true as const, ...parseFavorites(response) })),
                catchError(() => of({ ok: false as const })),
              );
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) {
          this.providers.set(result.providers);
          this.total.set(result.total);
          this.favorite.set(Object.fromEntries(result.providers.map((p) => [p.id, true])));
        } else {
          this.providers.set([]);
          this.error.set(true);
        }
        this.loading.set(false);
      });

    inject(DestroyRef).onDestroy(() => this.#cancelRequests());
  }

  /** "Tentar de novo". */
  load(): void {
    this.#loads.next();
  }

  /**
   * O coração do card: tira ou devolve aos favoritos. Um pedido por
   * profissional por vez (outro toque enquanto corre é ignorado); cada um
   * solta só o próprio estado.
   */
  toggle(providerId: string, next: boolean): void {
    const clientId = this.#clientId();
    if (!clientId || this.busy().has(providerId)) return;
    this.actionError.set('');
    this.#setBusy(providerId, true);
    // A resposta só vale para a conta que pediu: com outra na sessão, nada
    // dela (coração, erro ou carregando) chega à tela da conta nova.
    const current = () => this.#clientId() === clientId;
    const request = (next ? this.#provider.addFavorite(clientId, providerId) : this.#provider.removeFavorite(clientId, providerId))
      .subscribe({
        next: () => {
          if (current()) this.favorite.update((state) => ({ ...state, [providerId]: next }));
        },
        error: (error: unknown) => {
          if (!current()) return;
          this.#done(providerId);
          this.actionError.set(
            apiMessage(error) ?? (next ? 'Não foi possível salvar o favorito. Tente de novo.' : 'Não foi possível tirar dos favoritos. Tente de novo.'),
          );
        },
        complete: () => {
          if (current()) this.#done(providerId);
        },
      });
    if (!request.closed) this.#requests.set(providerId, request);
  }

  #done(providerId: string): void {
    this.#requests.delete(providerId);
    this.#setBusy(providerId, false);
  }

  #setBusy(providerId: string, value: boolean): void {
    this.busy.update((ids) => {
      const next = new Set(ids);
      if (value) next.add(providerId);
      else next.delete(providerId);
      return next;
    });
  }

  #cancelRequests(): void {
    for (const request of this.#requests.values()) request.unsubscribe();
    this.#requests.clear();
  }

  #reset(): void {
    this.#cancelRequests();
    this.busy.set(new Set());
    this.actionError.set('');
    this.providers.set([]);
    this.favorite.set({});
    this.total.set(0);
    this.loading.set(true);
    this.error.set(false);
  }
}

/** A lista da API (`{ items: [{ provider }], total }`) em cards; sem id válido, o profissional fica de fora. */
function parseFavorites(response: unknown): { providers: TgProvider[]; total: number } {
  const body = response && typeof response === 'object' ? (response as Record<string, unknown>) : {};
  const items = Array.isArray(body['items']) ? body['items'] : Array.isArray(response) ? response : [];
  const seen = new Set<string>();
  const providers: TgProvider[] = [];
  for (const item of items) {
    const source = item && typeof item === 'object' && 'provider' in item ? item.provider : item;
    const card = toTgProvider(source);
    if (card && !seen.has(card.id)) {
      seen.add(card.id);
      providers.push(card);
    }
  }
  const total = typeof body['total'] === 'number' && Number.isFinite(body['total']) ? Math.max(body['total'], providers.length) : providers.length;
  return { providers, total };
}

function apiMessage(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) return null;
  const body: unknown = error.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message: unknown = body.message;
    if (typeof message === 'string' && message.trim()) return message.trim();
  }
  return null;
}
