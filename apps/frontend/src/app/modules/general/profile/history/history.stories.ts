import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { Order } from '@shared/service/order/order';
import type { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { History } from './history';

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

interface Sample {
  id: string;
  status: string;
  title: string;
  person: string;
  days: number;
  hour: number;
  neighborhood: string;
  price: number;
  payment?: string;
  reviewed?: boolean;
}

const order = (s: Sample) =>
  ({
    id: s.id,
    clientId: 'c' + s.id,
    serviceId: 's' + s.id,
    status: s.status,
    scheduledFor: at(s.days, s.hour),
    requestedAt: at(s.days - 3, 10),
    clientConfirmedAt: s.status === 'CONCLUIDO' ? at(s.days, s.hour + 2) : null,
    finalPrice: s.price,
    client: { name: s.person },
    service: { title: s.title, provider: { user: { name: s.person } } },
    payment: s.payment ? { status: s.payment } : null,
    review: s.reviewed ? { id: 'r' + s.id } : null,
    addressSnap: { neighborhood: s.neighborhood },
  }) as unknown as OrderModel;

const CUSTOMER: OrdersResponse = [
  { id: '3101', status: 'AGENDADO', title: 'Instalação de chuveiro', person: 'Bruno Lima', days: 1, hour: 14, neighborhood: 'Vila Madalena', price: 120, payment: 'PAGO' },
  { id: '3102', status: 'AGUARDANDO_PAGAMENTO', title: 'Limpeza residencial', person: 'Carla Dias', days: 3, hour: 9, neighborhood: 'Pinheiros', price: 180, payment: 'CREATED' },
  { id: '3103', status: 'AGUARDANDO_APROVACAO', title: 'Montagem de armário', person: 'João Pereira', days: 5, hour: 10, neighborhood: 'Moema', price: 250 },
  { id: '3104', status: 'AGUARDANDO_CONFIRMACAO_CLIENTE', title: 'Troca de torneira', person: 'Paulo Reis', days: 0, hour: 8, neighborhood: 'Pinheiros', price: 90 },
  { id: '3090', status: 'CONCLUIDO', title: 'Conserto de tomada', person: 'Carlos Lima', days: -6, hour: 10, neighborhood: 'Pinheiros', price: 90 },
  { id: '3080', status: 'CONCLUIDO', title: 'Pintura de quarto', person: 'Rafael Santos', days: -20, hour: 8, neighborhood: 'Vila Madalena', price: 400, reviewed: true },
  { id: '3070', status: 'CANCELADO', title: 'Limpeza pós-obra', person: 'Ana Clara', days: -9, hour: 13, neighborhood: 'Moema', price: 300 },
].map(order);

const PROVIDER: OrdersResponse = [
  { id: '2042', status: 'AGUARDANDO_APROVACAO', title: 'Limpeza residencial', person: 'Ana Clara', days: 2, hour: 9, neighborhood: 'Pinheiros', price: 180 },
  { id: '2043', status: 'AGUARDANDO_APROVACAO', title: 'Troca de torneira', person: 'Paulo Reis', days: 4, hour: 15, neighborhood: 'Moema', price: 90 },
  { id: '2041', status: 'AGENDADO', title: 'Instalação de chuveiro', person: 'Marina Souza', days: 0, hour: 14, neighborhood: 'Vila Madalena', price: 120 },
  { id: '2044', status: 'EM_DESLOCAMENTO', title: 'Montagem de armário', person: 'João Pereira', days: 1, hour: 9, neighborhood: 'Moema', price: 250 },
  { id: '2045', status: 'AGUARDANDO_PAGAMENTO', title: 'Pintura de quarto', person: 'Rafael Santos', days: 6, hour: 8, neighborhood: 'Vila Madalena', price: 400 },
  { id: '2030', status: 'CONCLUIDO', title: 'Conserto de tomada', person: 'Carlos Lima', days: -13, hour: 10, neighborhood: 'Pinheiros', price: 90 },
  { id: '2029', status: 'REJEITADO', title: 'Limpeza pós-obra', person: 'Ana Souza', days: -15, hour: 9, neighborhood: 'Moema', price: 300 },
].map(order);

const later = <T>(value: T) => of(value).pipe(delay(400));

/** A tela dentro do shell logado; as APIs respondem depois de um instante, com dados de exemplo. */
function screen(type: 'CLIENTE' | 'PRESTADOR', orders: Observable<OrdersResponse>, tab?: string) {
  const name = type === 'CLIENTE' ? 'Ana Souza' : 'Bruno Lima';
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'general/:userId/history', component: History },
      { path: '**', redirectTo: 'general/42/history' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/general/42/history' + (tab ? `?aba=${tab}` : ''))),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '42', type, name, photoUrl: '' } }), logout: () => undefined },
    },
    {
      provide: Order,
      useValue: {
        getOrderByClient: () => orders,
        getOrderByProvider: () => orders,
        updateOrderStatus: () => of({}).pipe(delay(1000)),
      },
    },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Pedidos',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

export const Cliente: Story = {
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', later(CUSTOMER)) })],
};

export const ClienteConcluidos: Story = {
  name: 'Cliente: concluídos',
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', later(CUSTOMER), 'concluidos') })],
};

export const ClienteSemPedidos: Story = {
  name: 'Cliente sem pedidos',
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', later([])) })],
};

export const Profissional: Story = {
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen('PRESTADOR', later(PROVIDER)) })],
};

/** Toque em "Iniciar serviço" ou "Estou a caminho" para ver o botão carregando. */
export const ProfissionalAgendados: Story = {
  name: 'Profissional: agendados',
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen('PRESTADOR', later(PROVIDER), 'agendados') })],
};

export const Carregando: Story = {
  globals: { theme: 'CUSTOMER' },
  decorators: [applicationConfig({ providers: screen('CLIENTE', NEVER) })],
};

export const ComFalha: Story = {
  name: 'Com falha da API',
  globals: { theme: 'CUSTOMER' },
  decorators: [
    applicationConfig({
      providers: screen('CLIENTE', throwError(() => new Error('offline')).pipe(delay(400))),
    }),
  ],
};
