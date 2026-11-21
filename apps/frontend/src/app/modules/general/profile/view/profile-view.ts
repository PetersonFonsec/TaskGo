import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, of, startWith, Subject, switchMap } from 'rxjs';
import type { PublicAddressSummary } from '@taskgo/shared';

import { sessionUserId } from '@shared/guards/session-user/session-user.guard';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TokenService } from '@shared/service/token/token.service';
import { User } from '@shared/service/users/user';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { formatPhone, initials, PROFILE_SAVED_STATE, type ProfileLoad, profileLoad, profileRole } from '../personal-data';

interface Shortcut {
  label: string;
  text: string;
  link: string | readonly string[];
}

interface ChecklistItem {
  label: string;
  done: boolean;
  action: string;
  link: string | readonly string[];
}

/**
 * Dados pessoais (Etapa 10), em `/general/:userId/profile/view`: nome,
 * contato e foto de quem está logado, o progresso do cadastro e atalhos da
 * conta. O id vem da sessão, nunca da URL (a rota corrige a URL e a
 * autorização real é do backend). Endpoint de antes: GET /user/:id.
 */
@Component({
  selector: 'app-profile-view',
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
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileView {
  readonly #users = inject(User);
  readonly #session = inject(UserLoggedService);
  readonly #router = inject(Router);
  readonly #token = inject(TokenService);
  readonly #reloads = new Subject<void>();

  readonly userId = computed(() => sessionUserId(this.#session.user()));

  readonly state = signal<ProfileLoad>({ status: 'loading' });
  readonly loading = computed(() => this.state().status === 'loading');
  readonly profile = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.profile : null;
  });
  readonly loadError = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.error : null;
  });

  /**
   * Vindo da edição com os dados salvos. Só aparece com os dados carregados
   * (nunca ao lado de um erro de carregamento) e só para a conta que salvou.
   */
  readonly saved = signal(this.#router.currentNavigation()?.extras.state?.[PROFILE_SAVED_STATE] === true);
  readonly #savedFor = this.userId();

  readonly role = computed(() => profileRole(this.profile()?.type));
  readonly roleLabel = computed(() => ({ provider: 'Profissional', customer: 'Cliente', unknown: 'Conta' })[this.role()]);
  readonly initials = computed(() => initials(this.profile()?.name));
  readonly phone = computed(() => formatPhone(this.profile()?.phone));

  readonly editLink = computed(() => ['/general', this.userId() ?? '', 'profile', 'edit']);
  readonly addressesLink = computed(() => ['/general', this.userId() ?? '', 'addresses']);

  readonly primaryAddress = computed<PublicAddressSummary | undefined>(() => {
    const addresses = this.profile()?.addresses ?? [];
    return addresses.find((address) => address.isPrimary || address.isDefault) ?? addresses[0];
  });

  readonly checklist = computed<ChecklistItem[]>(() => {
    const user = this.profile();
    return [
      {
        label: 'Dados de contato',
        done: !!user?.name?.trim() && !!user?.email?.trim() && !!user?.phone?.trim(),
        action: 'Completar dados',
        link: this.editLink(),
      },
      { label: 'Foto de perfil', done: !!user?.photoUrl?.trim(), action: 'Adicionar foto', link: this.editLink() },
      { label: 'Endereço cadastrado', done: !!user?.addresses?.length, action: 'Adicionar endereço', link: this.addressesLink() },
    ];
  });
  readonly completed = computed(() => this.checklist().filter((item) => item.done).length);
  readonly completion = computed(() => Math.round((this.completed() / this.checklist().length) * 100));

  readonly shortcuts = computed<Shortcut[]>(() => {
    const id = this.userId() ?? '';
    const role = this.role();
    return [
      { label: 'Pedidos', text: 'Acompanhe seus atendimentos.', link: ['/general', id, 'history'] },
      ...(role === 'customer'
        ? [{ label: 'Profissionais favoritos', text: 'Encontre de novo quem você salvou.', link: '/customer/favorites' }]
        : []),
      ...(role === 'provider'
        ? [
            { label: 'Ganhos', text: 'Sua chave PIX e os repasses.', link: '/provider/recebimentos' },
            { label: 'Meus serviços', text: 'Gerencie os serviços que você oferece.', link: '/provider/services' },
          ]
        : []),
      { label: 'Meus endereços', text: 'Cadastre e atualize seus locais.', link: this.addressesLink() },
    ];
  });

  constructor() {
    // Recarrega quando a conta da sessão muda e a cada "Tentar de novo";
    // o switchMap descarta a resposta de uma consulta antiga.
    combineLatest([toObservable(this.userId), this.#reloads.pipe(startWith(undefined))])
      .pipe(
        switchMap(([id]) => (id ? profileLoad(this.#users.getUser(id)) : of<ProfileLoad>({ status: 'error', error: 'noUser' }))),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        if (this.userId() !== this.#savedFor) this.saved.set(false);
        this.state.set(state);
      });
  }

  reload(): void {
    this.#reloads.next();
  }

  login(): void {
    this.#token.clearToken();
    void this.#router.navigateByUrl('/authenticate/login');
  }
}
