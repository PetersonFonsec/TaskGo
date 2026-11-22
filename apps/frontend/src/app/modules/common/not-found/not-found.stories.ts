import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { TokenService } from '@shared/service/token/token.service';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { NotFound } from './not-found';

/** A página aberta num endereço que não existe, com a sessão de exemplo (ou sem sessão). */
function screen(session: { type: 'CLIENTE' | 'PRESTADOR'; name: string } | null) {
  return [
    provideLocationMocks(),
    provideRouter([{ path: '**', component: NotFound }]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/endereco-antigo')),
    { provide: TokenService, useValue: { token: session ? 'token-de-exemplo' : '' } },
    {
      provide: UserLoggedService,
      useValue: {
        user: signal(session ? { user: { id: '7', type: session.type, name: session.name, photoUrl: '' } } : {}),
        logout: () => undefined,
      },
    },
  ];
}

const meta: Meta<NotFound> = {
  title: 'Telas/Página não encontrada',
  component: NotFound,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<NotFound>;

/** Sem sessão: "Ir para o início" leva à entrada (/authenticate). */
export const Visitante: Story = {
  decorators: [applicationConfig({ providers: screen(null) })],
};

/** Cliente logado: topo com a navegação do cliente; "Ir para o início" leva a /customer. */
export const ClienteLogado: Story = {
  name: 'Cliente logado',
  decorators: [applicationConfig({ providers: screen({ type: 'CLIENTE', name: 'Ana Souza' }) })],
};

/** Prestador logado: tema do prestador; "Ir para o início" leva a /provider. */
export const PrestadorLogado: Story = {
  name: 'Prestador logado',
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen({ type: 'PRESTADOR', name: 'Bruno Lima' }) })],
};
