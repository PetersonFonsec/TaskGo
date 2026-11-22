import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Favorites } from './favorites';

const provider = (id: string, name: string, title: string, price: number, rating: number | null, count: number, verified = false) => ({
  provider: {
    id,
    verified,
    ratingAvg: rating,
    ratingCount: count,
    user: { id: 'u' + id, name, photoUrl: null },
    services: [{ id: 's' + id, title, basePrice: price, status: 'ATIVO', category: 'eletrica' }],
  },
});

const FAVORITES = {
  items: [
    provider('11', 'Bruno Lima', 'Instalação de chuveiro', 120, 4.9, 37, true),
    provider('12', 'Carla Dias', 'Limpeza residencial', 180, 4.7, 21, true),
    provider('13', 'João Pereira', 'Montagem de móveis', 150, null, 0),
    provider('14', 'Marina Souza', 'Pintura de parede', 300, 4.5, 8),
  ],
  total: 4,
};

/** A tela dentro do shell logado; a API responde depois de um instante, com dados de exemplo. */
function screen(list: Observable<unknown>) {
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'customer/favorites', component: Favorites },
      { path: '**', redirectTo: 'customer/favorites' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/customer/favorites')),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza', photoUrl: '' } }), logout: () => undefined },
    },
    {
      provide: Provider,
      useValue: {
        listFavorites: () => list,
        addFavorite: () => of({}).pipe(delay(500)),
        removeFavorite: () => of({}).pipe(delay(500)),
      },
    },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Favoritos',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'CUSTOMER' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** Toque no coração para tirar dos favoritos; o card fica, e outro toque devolve. */
export const ComFavoritos: Story = {
  name: 'Com favoritos',
  decorators: [applicationConfig({ providers: screen(of(FAVORITES).pipe(delay(400))) })],
};

export const SemFavoritos: Story = {
  name: 'Sem favoritos',
  decorators: [applicationConfig({ providers: screen(of({ items: [], total: 0 }).pipe(delay(400))) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen(NEVER) })],
};

export const ComFalha: Story = {
  name: 'Com falha da API',
  decorators: [applicationConfig({ providers: screen(throwError(() => new Error('offline')).pipe(delay(400))) })],
};
