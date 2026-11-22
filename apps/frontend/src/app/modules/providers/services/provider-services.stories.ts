import { HttpClient } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { type Offer, ProviderServicesPage } from './provider-services.page';

const week = (days: string[], start: string, end: string, slotMinutes: number) => ({
  weekdays: Object.fromEntries(days.map((day) => [day, [{ start, end, slotMinutes }]])),
});
const WORKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const OFFERS: Offer[] = [
  {
    id: 's1',
    title: 'Instalação de chuveiro elétrico',
    description: 'Troca ou instalação com teste de disjuntor e fiação. Material por conta do cliente.',
    category: 'eletrica',
    basePrice: 120,
    status: 'ATIVO',
    availability: week(WORKDAYS, '09:00', '17:00', 60),
  },
  {
    id: 's2',
    title: 'Troca de tomadas e interruptores',
    description: 'Até 5 pontos por visita.',
    category: 'eletrica',
    basePrice: '80.00',
    status: 'ATIVO',
    availability: week(['saturday'], '08:00', '12:00', 30),
  },
  {
    id: 's3',
    title: 'Montagem de móveis',
    description: null,
    category: 'montagem',
    basePrice: 150,
    status: 'INATIVO',
    availability: week(['monday', 'wednesday', 'friday'], '13:00', '18:00', 120),
  },
];

const CATEGORIES = {
  data: [
    { slug: 'eletrica', name: 'Elétrica' },
    { slug: 'hidraulica', name: 'Hidráulica' },
    { slug: 'montagem', name: 'Montagem' },
    { slug: 'limpeza', name: 'Limpeza' },
  ],
};

/** A tela dentro do shell logado do prestador; a API responde depois de um instante, com dados de exemplo. */
function screen(mine: Observable<unknown>) {
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'provider/services', component: ProviderServicesPage },
      { path: '**', redirectTo: 'provider/services' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/provider/services')),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '7', type: 'PRESTADOR', name: 'Bruno Lima', photoUrl: '' } }), logout: () => undefined },
    },
    {
      provide: HttpClient,
      useValue: {
        get: (url: string) => (url.includes('/categories') ? of(CATEGORIES) : mine),
        post: () => of({ id: 'novo' }).pipe(delay(600)),
        patch: () => of({}).pipe(delay(600)),
        delete: () => of({}).pipe(delay(600)),
      },
    },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Meus serviços',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'PROVIDER' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** "Novo serviço" e "Editar" abrem o formulário no painel; "Desativar" pede confirmação. */
export const ComServicos: Story = {
  name: 'Com serviços',
  decorators: [applicationConfig({ providers: screen(of(OFFERS).pipe(delay(400))) })],
};

export const SemServicos: Story = {
  name: 'Sem serviços',
  decorators: [applicationConfig({ providers: screen(of([]).pipe(delay(400))) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen(NEVER) })],
};

export const ComFalhaDaApi: Story = {
  name: 'Com falha da API',
  decorators: [applicationConfig({ providers: screen(throwError(() => new Error('offline')).pipe(delay(400))) })],
};
