import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { AuthenticatedShell } from './authenticated-shell';

// Conteúdo de exemplo no lugar da tela: o shell é o que a história mostra.
@Component({
  template: `
    <h1 style="margin: 0 0 8px; font: var(--tg-font-weight-extrabold) var(--tg-type-title-1-size) var(--tg-font-sans)">
      Conteúdo da tela
    </h1>
    <p style="margin: 0; color: var(--tg-text-secondary); font-family: var(--tg-font-sans)">
      O topo, a barra de abas (abaixo de 1024 px) e o rodapé vêm do shell.
    </p>
  `,
})
class ScreenComponent {}

const session = (type: 'CLIENTE' | 'PRESTADOR', name: string) => ({
  user: signal({ user: { id: '42', type, name, photoUrl: '' } }),
  logout: () => undefined,
});

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Shell logado',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

export const Cliente: Story = {
  globals: { theme: 'CUSTOMER' },
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([{ path: '**', component: ScreenComponent }]),
        { provide: UserLoggedService, useValue: session('CLIENTE', 'Ana Souza') },
      ],
    }),
  ],
};

export const Profissional: Story = {
  globals: { theme: 'PROVIDER' },
  decorators: [
    applicationConfig({
      providers: [
        provideRouter([{ path: '**', component: ScreenComponent }]),
        { provide: UserLoggedService, useValue: session('PRESTADOR', 'Bruno Lima') },
      ],
    }),
  ],
};
