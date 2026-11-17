import { HttpClient } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import type { ProviderHomeData } from '@modules/providers/home/data';
import { type PixDestination, ProviderPayoutPage, type Settlement } from './provider-payout.page';

const SETTLEMENTS: Settlement[] = [
  { orderId: '1042', amount: 180, status: 'PENDING', completedAt: null },
  { orderId: '1038', amount: 120, status: 'READY', completedAt: null },
  { orderId: '1031', amount: 250, status: 'SUCCEEDED', completedAt: '2026-11-14T15:20:00.000Z' },
  { orderId: '1027', amount: 90.5, status: 'SUCCEEDED', completedAt: '2026-11-10T18:05:00.000Z' },
  { orderId: '1019', amount: 300, status: 'SUCCEEDED', completedAt: '2026-11-03T13:40:00.000Z' },
];

const MONTHS = ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];
const home = (revenues: number[]) =>
  ({
    earnings: {
      today: 0,
      month: revenues[5],
      previousMonth: revenues[4],
      lastSixMonths: MONTHS.map((month, i) => ({ month, revenue: revenues[i] })),
    },
    services: { completedTotal: revenues.some((r) => r > 0) ? 12 : 0, completedThisWeek: 0 },
    rating: { average: 0, count: 0 },
    pendingRequests: [],
    recentServices: [],
  }) as unknown as ProviderHomeData;
const HOME = home([320, 540, 410, 760, 640.5, 300]);
const EMPTY_HOME = home([0, 0, 0, 0, 0, 0]);

const failing = <T>() => throwError((): unknown => new Error('offline')).pipe(delay(400)) as Observable<T>;
const later = <T>(value: T) => of(value).pipe(delay(400));

/** A tela dentro do shell logado do prestador; a API responde depois de um instante, com dados de exemplo. */
function screen(destination: Observable<PixDestination>, settlements: Observable<Settlement[]>, panel: Observable<ProviderHomeData> = later(HOME)) {
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'provider/recebimentos', component: ProviderPayoutPage },
      { path: '**', redirectTo: 'provider/recebimentos' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/provider/recebimentos')),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '7', type: 'PRESTADOR', name: 'Bruno Lima', photoUrl: '' } }), logout: () => undefined },
    },
    {
      provide: HttpClient,
      useValue: {
        get: (url: string) => (url.endsWith('/settlements') ? settlements : url.endsWith('/provider-home') ? panel : destination),
        put: (_url: string, body: PixDestination) => of(body).pipe(delay(600)),
      },
    },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Ganhos',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'PROVIDER' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** "Alterar chave" abre o formulário no painel. */
export const ComRepasses: Story = {
  name: 'Com repasses',
  decorators: [
    applicationConfig({ providers: screen(later({ type: 'EMAIL', key: 'bruno.lima@email.com' }), later(SETTLEMENTS)) }),
  ],
};

/** Profissional que ainda não ganhou nada: estado vazio no lugar do resumo, do gráfico e dos repasses. */
export const SemGanhos: Story = {
  name: 'Sem ganhos ainda',
  decorators: [applicationConfig({ providers: screen(later({ type: 'CPF', key: '' }), later([]), later(EMPTY_HOME)) })],
};

export const SemChavePix: Story = {
  name: 'Sem chave PIX',
  decorators: [applicationConfig({ providers: screen(later({ type: 'CPF', key: '' }), later(SETTLEMENTS)) })],
};

export const ComFalhaNoRepasse: Story = {
  name: 'Com falha no repasse',
  decorators: [
    applicationConfig({
      providers: screen(
        later({ type: 'CPF', key: '12345678901' }),
        later([{ orderId: '1050', amount: 140, status: 'FAILED', completedAt: null }, ...SETTLEMENTS.slice(2)]),
      ),
    }),
  ],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen(NEVER, NEVER, NEVER) })],
};

export const ComFalhaDaApi: Story = {
  name: 'Com falha da API',
  decorators: [
    applicationConfig({
      providers: screen(failing(), failing(), failing()),
    }),
  ],
};
