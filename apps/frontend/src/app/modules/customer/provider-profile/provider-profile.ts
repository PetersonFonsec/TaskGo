import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';

import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { User } from '@shared/service/users/user';
import { providerProfileView, type ProviderProfileView } from './provider-profile.view';

type LoadResult = { ok: true; view: ProviderProfileView | null } | { ok: false; notFound: boolean };

/**
 * Perfil do profissional (Etapa 10). O cliente vê em `/customer/profile/:id`
 * (aberto pela tela de agendamento) e o prestador vê a prévia do próprio
 * perfil em `/provider/profile/:id` (`data.preview`). Busca `GET /provider/:id`
 * pelo id do Provider, que é o mesmo do usuário.
 *
 * "Agendar serviço" leva à tela de agendamento (`/customer/:id`), como antes.
 */
@Component({
  selector: 'app-provider-profile',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgEmptyStateComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderProfile implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #userService = inject(User);
  readonly #destroyRef = inject(DestroyRef);
  readonly #reloads = new Subject<void>();

  /** Prévia do próprio prestador: sem "Agendar serviço" e com o caminho de volta para a conta. */
  readonly preview = this.#route.snapshot.data['preview'] === true;
  readonly profileUserId = signal(this.#route.snapshot.paramMap.get('userId') ?? '');

  readonly loading = signal(true);
  /** Falha ao abrir: 'notFound' (sem perfil público, 404 ou id inválido) ou 'failed'. */
  readonly loadError = signal<'notFound' | 'failed' | null>(null);
  readonly profile = signal<ProviderProfileView | null>(null);

  /** Volta a tentar a foto quando ela muda. */
  readonly photoFailed = linkedSignal({ source: () => this.profile()?.photoUrl, computation: () => false });

  ngOnInit(): void {
    combineLatest([this.#route.paramMap, this.#reloads.pipe(startWith(undefined))])
      .pipe(
        switchMap(([params]) => {
          const id = params.get('userId') ?? '';
          this.profileUserId.set(id);
          this.loading.set(true);
          this.loadError.set(null);
          return this.#userService.getProvider(id).pipe(
            map((response): LoadResult => ({ ok: true, view: providerProfileView(response) })),
            catchError((error: unknown) =>
              of<LoadResult>({
                ok: false,
                notFound: error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400),
              }),
            ),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result) => {
        if (result.ok && result.view) {
          this.profile.set(result.view);
        } else {
          this.profile.set(null);
          this.loadError.set(result.ok || result.notFound ? 'notFound' : 'failed');
        }
        this.loading.set(false);
      });
  }

  reload(): void {
    this.#reloads.next();
  }
}
