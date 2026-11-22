import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import type { PublicUserProfile } from '@taskgo/shared';
import type { TgIconName } from '@taskgo/icons';
import { catchError, map, type Observable, of, startWith, Subject, switchMap } from 'rxjs';

import { normalizeNavigationRole } from '@shared/components/ui/header/navigation.constant';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import {
  TgLoadingComponent,
  TgLoadingSkeletonDirective,
} from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { RolesBack } from '@shared/enums/roles.enum';
import { sessionUserId } from '@shared/guards/session-user/session-user.guard';
import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { User } from '@shared/service/users/user';

export interface AccountLink {
  readonly label: string;
  readonly description: string;
  readonly icon: TgIconName;
  readonly link: string | readonly string[];
  readonly href?: string;
}

export type AccountMode = 'customer' | 'provider';

/**
 * Links da Conta. Só rotas que existem hoje: os dados da conta (os mesmos do
 * menu da conta da barra do topo), os pedidos, ajuda e, para o prestador, a
 * prévia do perfil público.
 */
export function accountLinks(userId: string, mode: AccountMode): readonly AccountLink[] {
  const links: AccountLink[] = [
    {
      label: 'Dados pessoais',
      description: 'Nome, contato e foto.',
      icon: 'user',
      link: ['/general', userId, 'profile'],
    },
    {
      label: 'Endereços',
      description: 'Onde os serviços acontecem.',
      icon: 'map-pin',
      link: ['/general', userId, 'addresses'],
    },
    {
      label: 'Pedidos',
      description:
        mode === 'provider' ? 'Solicitações, agenda e histórico.' : 'Acompanhe seus serviços.',
      icon: 'receipt',
      link: ['/general', userId, 'history'],
    },
    {
      label: 'Ajuda',
      description: 'Fale com a equipe de suporte.',
      icon: 'question',
      link: '#',
      href: 'mailto:suporte@proxi.com.br',
    },
  ];
  if (mode === 'provider') {
    links.push({
      label: 'Perfil público',
      description: 'Veja como os clientes encontram você.',
      icon: 'eye',
      link: ['/provider/profile', userId],
    });
  }
  return links;
}

/** Iniciais para o avatar sem foto (a mesma regra do menu da conta). */
export function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase();
}

type ProfileState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly user: PublicUserProfile }
  | { readonly kind: 'error'; readonly status: number };

const LOADING: ProfileState = { kind: 'loading' };

/**
 * Conta (Etapa 10), em `/general/:userId/home`: o destino da aba "Conta"
 * abaixo de 1024 px. Mostra quem está na sessão (`GET /user/:id`, com o id da
 * sessão, nunca o da URL), os links da conta e o "Sair da conta".
 * Os links não dependem da API: ficam à vista mesmo com falha no perfil.
 */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly #session = inject(UserLoggedService);
  readonly #users = inject(User);
  readonly #token = inject(TokenService);
  readonly #router = inject(Router);
  readonly #retry = new Subject<void>();

  /** Id de quem está na sessão (o guard já corrigiu a URL para ele). */
  protected readonly userId = computed(() => sessionUserId(this.#session.user()));

  protected readonly mode = computed<AccountMode>(() =>
    normalizeNavigationRole(this.#session.user()?.user?.type) === RolesBack.PROVIDER
      ? 'provider'
      : 'customer',
  );
  protected readonly modeLabel = computed(() =>
    this.mode() === 'provider' ? 'Profissional' : 'Cliente',
  );

  protected readonly links = computed(() => {
    const id = this.userId();
    return id ? accountLinks(id, this.mode()) : [];
  });

  /**
   * Uma consulta por sessão; "Tentar de novo" refaz a da sessão atual e
   * descarta a anterior. Sessão sem id é tratada como sessão expirada.
   */
  protected readonly profile = toSignal(
    toObservable(this.userId).pipe(
      switchMap((id) =>
        id
          ? this.#retry.pipe(
              startWith(undefined),
              switchMap(() => this.#load(id)),
            )
          : of<ProfileState>({ kind: 'error', status: 401 }),
      ),
    ),
    { initialValue: LOADING },
  );

  protected readonly user = computed(() => {
    const state = this.profile();
    return state.kind === 'ready' ? state.user : null;
  });
  protected readonly initials = computed(() => accountInitials(this.user()?.name ?? ''));
  /** 401 ou sessão sem id: entrar de novo, não tentar de novo. */
  protected readonly expired = computed(() => {
    const state = this.profile();
    return state.kind === 'error' && state.status === 401;
  });

  protected retry(): void {
    this.#retry.next();
  }

  /** Sessão expirada: limpa o token e vai para o login (como a tela antiga). */
  protected login(): void {
    this.#token.clearToken();
    void this.#router.navigateByUrl('/authenticate/login');
  }

  protected signOut(): void {
    this.#session.logout();
  }

  #load(id: string): Observable<ProfileState> {
    return this.#users.getUser(id).pipe(
      map((user): ProfileState => ({ kind: 'ready', user })),
      startWith(LOADING),
      catchError((error: unknown) =>
        of<ProfileState>({
          kind: 'error',
          status: error instanceof HttpErrorResponse ? error.status : 0,
        }),
      ),
    );
  }
}
