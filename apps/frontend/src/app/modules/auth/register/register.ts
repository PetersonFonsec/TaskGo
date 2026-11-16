import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { finalize } from 'rxjs';

import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import type { TgIconName } from '@taskgo/icons';
import { UserStorage } from '@shared/service/users/user-storage';
import { Utils } from '@shared/service/utils/utils.service';
import { Theme } from '@shared/service/theme/theme';
import { Roles } from '@shared/enums/roles.enum';

import { RegisterUser } from '../services/register-user/register-user';

type StepKey = 'profile' | 'contact' | 'address' | 'service';

interface RegisterStep {
  key: StepKey;
  id: string;
  label: string;
  link: string;
}

const STEPS: RegisterStep[] = [
  { key: 'profile', id: 'profile-step', label: 'Perfil', link: '/authenticate/profile' },
  { key: 'contact', id: 'contact-step', label: 'Contato', link: '/authenticate/contact' },
  { key: 'address', id: 'address-step', label: 'Localização', link: '/authenticate/address' },
];
const PROVIDER_STEP: RegisterStep = {
  key: 'service',
  id: 'category-step',
  label: 'Anunciar um serviço',
  link: '/authenticate/category',
};

/** Criar conta (Etapa 10): tipo de conta em cards de escolha e passos em cards-link. */
@Component({
  selector: 'app-register',
  imports: [RouterLink, FullModal, TgAlertComponent, TgBadgeComponent, TgButtonComponent, TgCardComponent, TgIconComponent],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register implements OnInit {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #userStorage = inject(UserStorage);
  #router = inject(Router);
  #theme = inject(Theme);
  #destroyRef = inject(DestroyRef);

  readonly roles = Roles;
  readonly accountTypes: { role: Roles; id: string; title: string; text: string; icon: TgIconName }[] = [
    { role: Roles.CUSTOMER, id: 'account-type-customer', title: 'Cliente', text: 'Quero contratar serviços.', icon: 'user' },
    { role: Roles.PROVIDER, id: 'account-type-provider', title: 'Profissional', text: 'Quero oferecer meus serviços.', icon: 'wrench' },
  ];

  readonly completeSteps = this.#registerUser.completeSteps;
  readonly userType = signal<Roles>(this.#userStorage.type());
  readonly showModal = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly steps = computed(() => (this.userType() === Roles.PROVIDER ? [...STEPS, PROVIDER_STEP] : STEPS));
  readonly doneCount = computed(() => this.steps().filter((step) => this.isDone(step)).length);
  readonly allDone = computed(() => this.doneCount() === this.steps().length);

  ngOnInit(): void {
    this.#theme.change
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((role) => this.userType.set(role));
  }

  isDone(step: RegisterStep): boolean {
    return !!this.completeSteps()[step.key];
  }

  changeTheme(role: Roles) {
    this.userType.set(role);
    this.#theme.setTheme(role);
  }

  register() {
    if (this.loading() || !this.allDone()) return;
    this.error.set('');
    this.loading.set(true);
    this.#registerUser
      .register()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          this.#liveAnnouncer.announce('Conta criada com sucesso');
          this.showModal.set(true);
        },
        error: (error: HttpErrorResponse) => {
          this.#liveAnnouncer.announce('Houve um erro ao criar a sua conta');
          this.error.set(registerErrorMessage(error));
        },
      });
  }

  goToHome() {
    this.#router.navigateByUrl(Utils.getRouteByRole(this.userType()));
  }
}

export function registerErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  const message: unknown = error.error?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return 'Não foi possível criar a conta agora. Tente de novo em instantes.';
}
