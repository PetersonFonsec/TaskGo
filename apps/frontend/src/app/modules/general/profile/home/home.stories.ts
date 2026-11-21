import { HttpErrorResponse } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import type { PublicUserProfile } from '@taskgo/shared';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { User } from '@shared/service/users/user';
import { Home } from './home';

const CUSTOMER: PublicUserProfile = {
  id: '42',
  name: 'Ana Souza',
  email: 'ana.souza@email.com',
  phone: '11988887777',
  cpf: '12345678901',
  type: 'CLIENTE',
  photoUrl: null,
};

const PROVIDER: PublicUserProfile = {
  ...CUSTOMER,
  name: 'Bruno Lima',
  email: 'bruno.lima@email.com',
  type: 'PRESTADOR',
};

const later = <T>(value: T) => of(value).pipe(delay(400));
const failing = (status: number) =>
  throwError(() => new HttpErrorResponse({ status, statusText: 'Erro' })).pipe(delay(400));

/** A tela dentro do shell logado; a API responde depois de um instante, com dados de exemplo. */
function screen(type: 'CLIENTE' | 'PRESTADOR', profile: Observable<PublicUserProfile>) {
  const name = type === 'CLIENTE' ? CUSTOMER.name : PROVIDER.name;
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'general/:userId/home', component: Home },
      { path: '**', redirectTo: 'general/42/home' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/general/42/home')),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '42', type, name, photoUrl: '' } }), logout: () => undefined },
    },
    { provide: User, useValue: { getUser: () => profile } },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Conta',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

export const Cliente: Story = {
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', later(CUSTOMER)) })],
};

/** O prestador tem também a prévia do perfil público. */
export const Profissional: Story = {
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen('PRESTADOR', later(PROVIDER)) })],
};

export const Carregando: Story = {
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', NEVER) })],
};

/** Os links continuam à vista; "Tentar de novo" repete só a consulta do perfil. */
export const ComFalha: Story = {
  name: 'Com falha da API',
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', failing(500)) })],
};

export const SessaoExpirada: Story = {
  name: 'Sessão expirada',
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', failing(401)) })],
};
