import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import type { ProviderHomeData } from './data';
import { ProviderHomePage } from './home';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const order = (
  id: string,
  status: string,
  title: string,
  client: string,
  days: number,
  hour: number,
  neighborhood: string,
  price: number,
) =>
  ({
    id,
    clientId: 'c' + id,
    serviceId: 's' + id,
    status,
    scheduledFor: at(days, hour),
    finalPrice: price,
    client: { name: client },
    service: { title },
    addressSnap: { street: 'Rua Harmonia', number: '123', complement: 'apto 41', neighborhood },
  }) as unknown as OrderModel;

const ORDERS: OrdersResponse = [
  order('2041', 'AGENDADO', 'Instalação de chuveiro', 'Marina Souza', 0, 14, 'Vila Madalena', 120),
  order('2042', 'AGUARDANDO_APROVACAO', 'Limpeza residencial', 'Ana Clara', 2, 9, 'Pinheiros', 180),
  order('2043', 'AGUARDANDO_APROVACAO', 'Troca de torneira', 'Paulo Reis', 4, 15, 'Moema', 90),
  order('2044', 'EM_DESLOCAMENTO', 'Montagem de armário', 'João Pereira', 1, 9, 'Moema', 250),
  order(
    '2045',
    'AGUARDANDO_PAGAMENTO',
    'Pintura de quarto',
    'Rafael Santos',
    6,
    8,
    'Vila Madalena',
    400,
  ),
  order('2030', 'CONCLUIDO', 'Conserto de tomada', 'Carlos Lima', -13, 10, 'Pinheiros', 90),
];

const daysAgo = (days: number) => at(-days, 15);

const HOME: ProviderHomeData = {
  earnings: {
    today: 180,
    month: 3240,
    previousMonth: 2900,
    lastSixMonths: [
      { month: 'Jun', revenue: 1540 },
      { month: 'Jul', revenue: 2110 },
      { month: 'Ago', revenue: 1860 },
      { month: 'Set', revenue: 2720 },
      { month: 'Out', revenue: 2900 },
      { month: 'Nov', revenue: 3240 },
    ],
  },
  services: { completedTotal: 48, completedThisWeek: 3 },
  rating: { average: 4.9, count: 37 },
  pendingRequests: [],
  activeOrders: [],
  recentServices: [
    {
      id: '2030',
      clientName: 'Carlos Lima',
      service: 'Conserto de tomada',
      completedAt: daysAgo(13),
      amount: 72,
      rating: 5,
    },
    {
      id: '2028',
      clientName: 'Ana Souza',
      service: 'Limpeza pós-obra',
      completedAt: daysAgo(21),
      amount: 216,
      rating: null,
    },
    {
      id: '2025',
      clientName: 'Rafael Santos',
      service: 'Troca de fechadura',
      completedAt: daysAgo(30),
      amount: 96,
      rating: 4,
    },
  ],
  insights: {
    mostRequestedService: 'Limpeza residencial',
    averageTicket: 165,
    mostServedNeighborhood: 'Pinheiros',
    monthlyGrowth: 12,
  },
};

const EMPTY_HOME: ProviderHomeData = {
  ...HOME,
  earnings: {
    today: 0,
    month: 0,
    previousMonth: 0,
    lastSixMonths: HOME.earnings.lastSixMonths.map((m) => ({ ...m, revenue: 0 })),
  },
  services: { completedTotal: 0, completedThisWeek: 0 },
  rating: { average: 0, count: 0 },
  recentServices: [],
  insights: {
    mostRequestedService: null,
    averageTicket: 0,
    mostServedNeighborhood: null,
    monthlyGrowth: null,
  },
};

function providers(
  orders: Observable<OrdersResponse>,
  home: Observable<ProviderHomeData>,
  updateOrderStatus: () => Observable<unknown> = () => of({}).pipe(delay(1000)),
) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: HttpClient, useValue: { get: () => home } },
    {
      provide: Order,
      useValue: {
        getOrderByProvider: () => orders,
        updateOrderStatus,
      },
    },
    {
      provide: UserLoggedService,
      useValue: { user: () => ({ user: { id: '17', name: 'Bruno Alves' } }) },
    },
  ];
}

const meta: Meta<ProviderHomePage> = {
  title: 'Telas/Início do prestador',
  component: ProviderHomePage,
  parameters: { layout: 'padded' },
  globals: { theme: 'PROVIDER' },
};
export default meta;

type Story = StoryObj<ProviderHomePage>;

/** O próximo atendimento, as solicitações com "Responder", o resto da agenda e os ganhos. */
export const ComAgenda: Story = {
  name: 'Com agenda',
  decorators: [applicationConfig({ providers: providers(of(ORDERS), of(HOME)) })],
};

/** Conta nova: agenda livre e, sem nenhum serviço concluído, um estado vazio no lugar de ganhos e insights. */
export const Vazio: Story = {
  decorators: [applicationConfig({ providers: providers(of([]), of(EMPTY_HOME)) })],
};

/** As duas consultas falharam: um alerta com "Tentar de novo" em cada seção. */
export const Erro: Story = {
  decorators: [
    applicationConfig({
      providers: providers(
        throwError(() => new Error('offline')),
        throwError(() => new Error('offline')),
      ),
    }),
  ],
};

/** Ainda carregando: skeleton no formato do card, da lista e dos indicadores. */
export const Carregando: Story = {
  decorators: [applicationConfig({ providers: providers(NEVER, NEVER) })],
};

/** Doze solicitações para revisar a expansão, aria-expanded e o foco da primeira linha nova. */
export const MuitasSolicitacoes: Story = {
  name: 'Muitas solicitações',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          Array.from({ length: 12 }, (_, index) =>
            order(
              `request-${index + 1}`,
              'AGUARDANDO_APROVACAO',
              `Serviço solicitado ${index + 1}`,
              `Cliente ${index + 1}`,
              index + 1,
              9,
              'Pinheiros',
              120,
            ),
          ),
        ),
        of(EMPTY_HOME),
      ),
    }),
  ],
};

/** A API aceita a troca, mas a consulta silenciosa seguinte falha. */
export const FalhaAoSincronizar: Story = {
  name: 'Falha ao sincronizar',
  decorators: [
    applicationConfig({
      providers: providers(
        new Observable<OrdersResponse>((subscriber) => {
          // A primeira chamada carrega a agenda; a segunda simula a recarga após a ação.
          if (!failedSyncCalls++) subscriber.next([ORDERS[0]]);
          else subscriber.error(new Error('offline'));
        }),
        of(HOME),
        () => of({}),
      ),
    }),
  ],
};

let failedSyncCalls = 0;
