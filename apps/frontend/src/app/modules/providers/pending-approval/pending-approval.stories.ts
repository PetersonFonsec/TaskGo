import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { PendingApproval } from './pending-approval';

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'AGUARDANDO_APROVACAO',
    expiresAt: hoursFromNow(10),
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 150 },
    provider: { id: '7', name: 'Bruno Lima', photoUrl: null },
    client: { id: '12', name: 'Marina Souza', photoUrl: null },
    schedule: { requestedAt: hoursFromNow(-2), scheduledFor: at(2, 14), scheduledEnd: at(2, 16) },
    address: {
      street: 'Rua Harmonia',
      number: '123',
      complement: 'apto 41',
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      cep: '05435-000',
    },
    distanceKm: 3.2,
    providerEarnings: { grossAmount: 150, feePct: 0.12, feeAmount: 18, netAmount: 132 },
    cancellation: null,
    payment: null,
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

const later = <T>(value: T) => of(value).pipe(delay(400));
const failing = <T>(status: number) =>
  throwError(() => new HttpErrorResponse({ status })).pipe(delay(400)) as Observable<T>;

interface Api {
  order: Observable<OrderDetails>;
  confirm?: Observable<unknown>;
  cancel?: Observable<unknown>;
  /** Abre a tela como o link do aviso de nova solicitação com `?recusar`. */
  url?: string;
}

/** A tela dentro do shell logado do prestador; a API responde depois de um instante. */
function screen({ order, confirm = later({}), cancel = later({}), url = '/provider/1042/aprovacao' }: Api) {
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'provider/:orderId/aprovacao', component: PendingApproval },
      { path: '**', redirectTo: 'provider/1042/aprovacao' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl(url)),
    {
      provide: UserLoggedService,
      useValue: {
        user: signal({ user: { id: '7', type: 'PRESTADOR', name: 'Bruno Lima', photoUrl: '' } }),
        logout: () => undefined,
      },
    },
    { provide: HttpClient, useValue: { get: () => NEVER, post: () => NEVER } },
    {
      provide: Order,
      useValue: { getOrderDetails: () => order, confirmOrder: () => confirm, cancelOrder: () => cancel },
    },
  ];
}

/** Espera o elemento aparecer (a API de mentira responde em 400 ms). */
async function waitFor<T extends Element>(find: () => T | null | undefined): Promise<T> {
  for (let i = 0; i < 60; i++) {
    const found = find();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Elemento não apareceu');
}
const buttonByText = (label: string) => () =>
  [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Responder solicitação',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'PROVIDER' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** Quando, onde, quanto recebe e o prazo para responder. */
export const Pendente: Story = {
  name: 'Solicitação pendente',
  decorators: [applicationConfig({ providers: screen({ order: later(details()) }) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen({ order: NEVER }) })],
};

/** "Recusar" (ou o link com `?recusar`) pede o motivo e a confirmação num diálogo. */
export const Recusar: Story = {
  name: 'Confirmar recusa',
  decorators: [
    applicationConfig({
      providers: screen({ order: later(details()), url: '/provider/1042/aprovacao?recusar=1' }),
    }),
  ],
  play: async () => {
    const other = await waitFor(() => document.querySelector<HTMLInputElement>('dialog[open] input[value="OTHER"]'));
    other.click();
    const note = await waitFor(() => document.querySelector<HTMLTextAreaElement>('dialog textarea'));
    note.value = 'Vou estar fora da cidade nesse dia.';
    note.dispatchEvent(new Event('input'));
  },
};

/** "Aceitar serviço" enviando: o botão fica em carregamento e as ações não repetem o envio. */
export const EnviandoAceite: Story = {
  name: 'Enviando resposta',
  decorators: [applicationConfig({ providers: screen({ order: later(details()), confirm: NEVER }) })],
  play: async () => (await waitFor(buttonByText('Aceitar serviço'))).click(),
};

/** "Recusar solicitação" enviando: o diálogo fica ocupado até a API responder. */
export const EnviandoRecusa: Story = {
  name: 'Enviando recusa',
  decorators: [
    applicationConfig({
      providers: screen({ order: later(details()), cancel: NEVER, url: '/provider/1042/aprovacao?recusar=1' }),
    }),
  ],
  play: async () => {
    (await waitFor(() => document.querySelector<HTMLInputElement>('dialog[open] input[value="NO_AVAILABILITY"]'))).click();
    (await waitFor(buttonByText('Recusar solicitação'))).click();
  },
};

/** Depois do aceite: o aviso substitui as ações. */
export const Aceita: Story = {
  name: 'Já aceita',
  decorators: [
    applicationConfig({
      providers: screen({ order: later(details({ status: 'AGUARDANDO_PAGAMENTO', expiresAt: hoursFromNow(2) })) }),
    }),
  ],
};

export const Recusada: Story = {
  name: 'Já recusada',
  decorators: [
    applicationConfig({
      providers: screen({
        order: later(
          details({
            status: 'CANCELADO',
            expiresAt: null,
            cancellation: {
              reason: 'NO_AVAILABILITY',
              label: 'Sem horário disponível',
              note: 'Agenda cheia nesta semana',
              canceledAt: hoursFromNow(-1),
            },
          }),
        ),
      }),
    }),
  ],
};

/** O prazo para responder terminou: o backend cancela e registra EXPIRED. */
export const Expirada: Story = {
  decorators: [
    applicationConfig({
      providers: screen({
        order: later(
          details({
            status: 'CANCELADO',
            expiresAt: null,
            schedule: { requestedAt: hoursFromNow(-14), scheduledFor: at(1, 9), scheduledEnd: at(1, 11) },
            timeline: [
              { type: 'CREATED', title: 'Solicitação enviada', date: hoursFromNow(-14), completed: true },
              { type: 'EXPIRED', title: 'Pedido expirado', date: hoursFromNow(-2), completed: true },
            ],
          }),
        ),
      }),
    }),
  ],
};

export const ErroAoCarregar: Story = {
  name: 'Erro ao carregar',
  decorators: [applicationConfig({ providers: screen({ order: failing(500) }) })],
};

/** A API recusou o aceite: a solicitação já tinha saído de "aguardando". */
export const ErroAoResponder: Story = {
  name: 'Erro ao responder',
  decorators: [applicationConfig({ providers: screen({ order: later(details()), confirm: failing(400) }) })],
  play: async () => (await waitFor(buttonByText('Aceitar serviço'))).click(),
};
