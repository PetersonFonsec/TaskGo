import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ProfileHeaderInfo } from '@shared/components/ui/profile-header-info/profile-header-info';
import { TokenService } from '@shared/service/token/token.service';
import { User } from '@shared/service/users/user';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-profile',
  imports: [RouterOutlet, ProfileHeaderInfo],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  private readonly session = inject(UserLoggedService);
  private readonly users = inject(User);

  private readonly router = inject(Router);
  private readonly token = inject(TokenService);
  private readonly retry = new Subject<void>();

  retryLoad() {
    this.retry.next();
  }

  login() {
    this.token.clearToken();
    void this.router.navigateByUrl('/authenticate/login');
  }

  readonly profile = toSignal(
    combineLatest([this.retry.pipe(startWith(undefined))]).pipe(
      switchMap(() => {
        const id = String(this.session.user()?.user?.id ?? '');
        return id
          ? this.users.getUser(id).pipe(
              map((user) => ({ user, loading: false, error: '', status: 0 })),
              startWith({ user: null, loading: true, error: '', status: 0 }),
              catchError((error) =>
                of({
                  user: null,
                  loading: false,
                  error: 'Erro ao carregar o perfil',
                  status: error?.status ?? 0,
                }),
              ),
            )
          : of({ user: null, loading: false, error: 'Usuário não encontrado', status: 404 });
      }),
    ),
  );
}
