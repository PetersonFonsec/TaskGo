import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `<main>
    <h1>{{ resetMode ? 'Criar nova senha' : 'Recuperar acesso' }}</h1>
    <p>{{ resetMode ? 'Use pelo menos 10 caracteres.' : 'Informe o e-mail da sua conta.' }}</p>
    <form (ngSubmit)="submit()">
      @if (resetMode) {
        <label
          >Nova senha<input
            name="password"
            type="password"
            autocomplete="new-password"
            minlength="10"
            maxlength="72"
            required
            [(ngModel)]="password"
        /></label>
      } @else {
        <label
          >E-mail<input name="email" type="email" autocomplete="email" required [(ngModel)]="email"
        /></label>
      }
      <button type="submit" [disabled]="busy()">
        {{ busy() ? 'Enviando…' : resetMode ? 'Atualizar senha' : 'Enviar instruções' }}
      </button>
    </form>
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <a routerLink="/authenticate/login">Voltar para entrar</a>
  </main>`,
  styles: [
    `
      main {
        max-width: 440px;
        margin: 4rem auto;
        padding: 1.5rem;
      }
      form,
      label {
        display: grid;
        gap: 1rem;
      }
      input,
      button {
        padding: 0.8rem;
        font: inherit;
      }
      p,
      a {
        display: block;
        margin-top: 1rem;
      }
    `,
  ],
})
export class RecoveryPage {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly resetMode = this.route.snapshot.data['reset'] === true;
  private readonly token =
    new URLSearchParams(this.route.snapshot.fragment ?? '').get('token') ?? '';
  email = '';
  password = '';
  busy = signal(false);
  message = signal('');
  error = signal('');
  submit() {
    if (this.busy()) return;
    this.error.set('');
    this.message.set('');
    if (this.resetMode && !this.token) {
      this.error.set('Link inválido. Solicite uma nova recuperação.');
      return;
    }
    this.busy.set(true);
    this.http
      .post<{ message: string }>(
        environment.url + (this.resetMode ? '/auth/reset-password' : '/auth/forget'),
        this.resetMode
          ? { token: this.token, password: this.password }
          : { email: this.email.trim() },
      )
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (result) => {
          this.message.set(result.message);
          this.password = '';
        },
        error: (error) =>
          this.error.set(
            error.error?.message ?? 'Não foi possível concluir. Tente novamente mais tarde.',
          ),
      });
  }
}
