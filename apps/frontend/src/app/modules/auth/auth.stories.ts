import { provideLocationMocks } from '@angular/common/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, provideAppInitializer } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, of, throwError } from 'rxjs';
import { UserRegister } from '@shared/service/users/user-register';
import { AuthPage } from './auth-page';
import { Login } from './login/login';
import { RecoveryPage } from './recovery/recovery.page';

/**
 * Casca da autenticação com as telas filhas. A navegação usa um Location
 * falso: a URL do iframe do Storybook não muda.
 */
function screen(url: string, opts: { loginFails?: boolean } = {}) {
  return [
    provideLocationMocks(),
    // A história já é a casca (AuthPage): as telas entram na saída dela.
    provideRouter([
      {
        path: 'authenticate',
        children: [
          { path: '', pathMatch: 'full', children: [] },
          { path: 'login', component: Login },
          { path: 'forgot-password', component: RecoveryPage },
          { path: 'reset-password', component: RecoveryPage, data: { reset: true } },
        ],
      },
      { path: '**', redirectTo: 'authenticate' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl(url)),
    {
      provide: UserRegister,
      useValue: {
        login: () =>
          opts.loginFails
            ? throwError(() => new HttpErrorResponse({ status: 401, error: { message: 'E-mail ou senha incorretos.' } })).pipe(delay(600))
            : of({ user: { type: 'CLIENTE' } }).pipe(delay(1500)),
      },
    },
    // Recuperar e nova senha respondem com sucesso depois de um instante.
    { provide: HttpClient, useValue: { post: () => of({ message: 'ok' }).pipe(delay(800)) } },
  ];
}

const meta: Meta<AuthPage> = {
  title: 'Telas/Entrar e recuperar acesso',
  component: AuthPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthPage>;

/** Entrada: sem carrossel; "Entrar" e "Criar conta". */
export const Entrada: Story = {
  decorators: [applicationConfig({ providers: screen('/authenticate') })],
};

/** Toque em "Entrar" vazio para ver os erros por campo e o foco no primeiro. */
export const Entrar: Story = {
  decorators: [applicationConfig({ providers: screen('/authenticate/login') })],
};

/** Preencha e envie para ver o alerta de erro da API. */
export const EntrarComFalha: Story = {
  name: 'Entrar com falha da API',
  decorators: [applicationConfig({ providers: screen('/authenticate/login', { loginFails: true }) })],
};

/** Envie um e-mail para ver a confirmação "Confira seu e-mail". */
export const RecuperarAcesso: Story = {
  name: 'Recuperar acesso',
  decorators: [applicationConfig({ providers: screen('/authenticate/forgot-password') })],
};

export const NovaSenha: Story = {
  name: 'Criar nova senha',
  decorators: [applicationConfig({ providers: screen('/authenticate/reset-password#token=exemplo') })],
};

export const LinkInvalido: Story = {
  name: 'Criar nova senha sem link válido',
  decorators: [applicationConfig({ providers: screen('/authenticate/reset-password') })],
};
