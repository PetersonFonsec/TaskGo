import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, of, startWith, Subject, type Subscription, switchMap } from 'rxjs';
import type { PublicUserProfile } from '@taskgo/shared';

import { sessionUserId } from '@shared/guards/session-user/session-user.guard';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgFieldComponent } from '@shared/design-system/field/tg-field.component';
import { TgInputDirective } from '@shared/design-system/field/tg-input.directive';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { TokenService } from '@shared/service/token/token.service';
import { User } from '@shared/service/users/user';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import {
  draftFrom,
  hasErrors,
  initials,
  NAME_MAX,
  PHOTO_URL_MAX,
  PROFILE_SAVED_STATE,
  type PersonalDataDraft,
  type PersonalDataErrors,
  profileChanges,
  type ProfileLoad,
  profileLoad,
  saveErrorMessage,
  validatePersonalData,
} from '../personal-data';

const NO_ERRORS: PersonalDataErrors = { photoUrl: '', name: '', email: '', phone: '' };

/**
 * Editar dados pessoais (Etapa 10), em `/general/:userId/profile/edit`.
 * Os erros aparecem ao salvar, o foco vai ao primeiro campo inválido e o
 * botão nunca fica desabilitado por validação. Só os campos que mudaram vão
 * no PATCH /user/:id (a API desfaz a verificação do e-mail e do telefone
 * que recebe). Salvo, volta para os dados com a confirmação.
 */
@Component({
  selector: 'app-profile-edit',
  imports: [
    FormsModule,
    RouterLink,
    TgAlertComponent,
    TgButtonComponent,
    TgCardComponent,
    TgFieldComponent,
    TgIconComponent,
    TgInputDirective,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSkeletonComponent,
  ],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileEdit {
  readonly #users = inject(User);
  readonly #session = inject(UserLoggedService);
  readonly #router = inject(Router);
  readonly #token = inject(TokenService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #reloads = new Subject<void>();
  /** O PATCH em curso e a conta que o pediu. */
  #pendingSave: { userId: string; request?: Subscription } | null = null;

  readonly nameMax = NAME_MAX;
  readonly photoUrlMax = PHOTO_URL_MAX;

  readonly userId = computed(() => sessionUserId(this.#session.user()));
  readonly viewLink = computed(() => ['/general', this.userId() ?? '', 'profile', 'view']);

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

  readonly photoUrl = signal('');
  readonly name = signal('');
  readonly email = signal('');
  readonly phone = signal('');

  readonly submitted = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');
  readonly unchanged = signal(false);

  readonly draft = computed<PersonalDataDraft>(() => ({
    photoUrl: this.photoUrl(),
    name: this.name(),
    email: this.email(),
    phone: this.phone(),
  }));
  /** Erros só depois de tentar salvar; depois, somem conforme a pessoa corrige. */
  readonly errors = computed(() => (this.submitted() ? validatePersonalData(this.draft()) : NO_ERRORS));
  /** A prévia só mostra um link que a tela aceitaria. */
  readonly preview = computed(() => {
    const url = this.photoUrl().trim();
    return url && !validatePersonalData(this.draft()).photoUrl ? url : '';
  });
  readonly initials = computed(() => initials(this.name() || this.profile()?.name));

  readonly emailHint = computed(() =>
    this.profile()?.emailVerified ? 'Ao trocar, o novo e-mail precisa ser verificado.' : '',
  );
  readonly phoneHint = computed(() =>
    this.profile()?.phoneVerified ? 'Com DDD. Ao trocar, o novo telefone precisa ser verificado.' : 'Com DDD.',
  );

  readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  readonly emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');

  constructor() {
    combineLatest([toObservable(this.userId), this.#reloads.pipe(startWith(undefined))])
      .pipe(
        switchMap(([id]) => (id ? profileLoad(this.#users.getUser(id)) : of<ProfileLoad>({ status: 'error', error: 'noUser' }))),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        // Outra conta na sessão: o salvamento da anterior não fala mais com esta tela.
        if (this.#pendingSave && this.#pendingSave.userId !== this.userId()) this.#dropSave();
        this.state.set(state);
        if (state.status === 'ready') this.#fill(state.profile);
      });
  }

  reload(): void {
    this.#reloads.next();
  }

  login(): void {
    this.#token.clearToken();
    void this.#router.navigateByUrl('/authenticate/login');
  }

  save(): void {
    if (this.saving()) return;
    const profile = this.profile();
    const userId = this.userId();
    if (!profile || !userId) return;

    this.submitted.set(true);
    this.saveError.set('');
    this.unchanged.set(false);

    const errors = validatePersonalData(this.draft());
    if (hasErrors(errors)) {
      const order: [keyof PersonalDataErrors, HTMLInputElement | undefined][] = [
        ['photoUrl', this.photoInput()?.nativeElement],
        ['name', this.nameInput()?.nativeElement],
        ['email', this.emailInput()?.nativeElement],
        ['phone', this.phoneInput()?.nativeElement],
      ];
      order.find(([field]) => errors[field])?.[1]?.focus();
      return;
    }

    const changes = profileChanges(profile, this.draft());
    if (!Object.keys(changes).length) {
      this.unchanged.set(true);
      return;
    }

    this.saving.set(true);
    // A resposta só vale para a conta que salvou: se a sessão trocar antes,
    // nada da conta anterior chega à sessão, à tela ou à navegação.
    const pending: { userId: string; request?: Subscription } = { userId };
    this.#pendingSave = pending;
    const current = () => this.#pendingSave === pending && this.userId() === userId;
    pending.request = this.#users
      .updateUser(userId, changes)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: (saved) => {
          if (!current()) return this.#dropSave(pending);
          this.#pendingSave = null;
          this.saving.set(false);
          this.#syncSession(saved);
          void this.#router.navigate(this.viewLink(), { state: { [PROFILE_SAVED_STATE]: true } });
        },
        error: (error: unknown) => {
          if (!current()) return this.#dropSave(pending);
          this.#pendingSave = null;
          this.saving.set(false);
          this.saveError.set(saveErrorMessage(error));
        },
      });
  }

  /** Para de ouvir o PATCH da conta anterior e solta o botão (`only`: só se ainda for este). */
  #dropSave(only?: { userId: string; request?: Subscription }): void {
    if (only && this.#pendingSave !== only) return;
    this.#pendingSave?.request?.unsubscribe();
    this.#pendingSave = null;
    this.saving.set(false);
  }

  #fill(profile: PublicUserProfile): void {
    const draft = draftFrom(profile);
    this.photoUrl.set(draft.photoUrl);
    this.name.set(draft.name);
    this.email.set(draft.email);
    this.phone.set(draft.phone);
    this.submitted.set(false);
    this.saveError.set('');
    this.unchanged.set(false);
  }

  /** O nome e a foto do menu da conta vêm da sessão: ela recebe o que a API devolveu. */
  #syncSession(saved: PublicUserProfile | null): void {
    const session = this.#session.user();
    if (!saved || !session?.user || sessionUserId(session) !== saved.id) return;
    this.#session.setUserLogged({
      ...session,
      user: {
        ...session.user,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        photoUrl: saved.photoUrl ?? '',
      },
    });
  }
}
