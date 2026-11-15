import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Address } from '@shared/service/address/address';
import { CategoryService } from '@shared/service/category/category';
import type { ICategory } from '@shared/service/category/category.model';
import { Order } from '@shared/service/order/order';
import type { OrderModel, OrdersResponse } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Home } from './home';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const order = (id: string, status: string, title: string, provider: string, days: number, hour: number, extra: Partial<OrderModel> = {}) =>
  ({
    id,
    clientId: '1',
    serviceId: 's' + id,
    status,
    scheduledFor: at(days, hour),
    service: { title, provider: { user: { name: provider } } },
    addressSnap: { street: 'Rua dos Pinheiros', number: '870', complement: 'apto 12', neighborhood: 'Pinheiros' },
    ...extra,
  }) as OrderModel;

const ORDERS: OrdersResponse = [
  order('1041', 'EM_DESLOCAMENTO', 'Instalação de chuveiro', 'Marina Souza', 0, 14),
  order('1042', 'AGUARDANDO_PAGAMENTO', 'Limpeza residencial', 'Ana Souza', 3, 9, {
    payment: { status: 'CREATED' } as OrderModel['payment'],
  }),
  order('1043', 'AGUARDANDO_APROVACAO', 'Montagem de armário', 'João Pereira', 6, 10),
  order('1044', 'AGENDADO', 'Pintura de quarto', 'Rafael Santos', 9, 8),
  order('1030', 'CONCLUIDO', 'Conserto de tomada', 'Carlos Lima', -13, 10),
  order('1031', 'CONCLUIDO', 'Limpeza pós-obra', 'Ana Souza', -21, 9, { review: { id: 'r1' } as OrderModel['review'] }),
  order('1032', 'CANCELADO', 'Troca de fechadura', 'Bruno Alves', -28, 15),
];

const CATEGORIES = ['Limpeza', 'Reparos', 'Pets', 'Jardinagem'].map(
  (name, id) => ({ id, name, slug: name.toLowerCase(), thumb: null }) as unknown as ICategory,
);

function providers(orders: Observable<OrdersResponse>, hasAddress = true) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: Address, useValue: { getAddress: () => of({ data: hasAddress ? [{ id: 'a1' }] : [] }) } },
    { provide: CategoryService, useValue: { getCategories: () => of({ data: CATEGORIES }) } },
    { provide: Order, useValue: { getOrderByClient: () => orders } },
    { provide: UserLoggedService, useValue: { user: () => ({ user: { id: '1', name: 'Ana Clara Souza' } }) } },
  ];
}

const meta: Meta<Home> = {
  title: 'Telas/Início do cliente',
  component: Home,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<Home>;

/** Destaque (o pedido que pede ação), os demais ativos e o histórico real. */
export const ComAgenda: Story = {
  name: 'Com agenda',
  decorators: [applicationConfig({ providers: providers(of(ORDERS)) })],
};

/** Sem endereço cadastrado: o alerta informativo aparece no topo. */
export const SemEndereco: Story = {
  name: 'Sem endereço',
  decorators: [applicationConfig({ providers: providers(of(ORDERS), false) })],
};

/** Sem pedidos: estado vazio compacto na agenda e sem histórico. */
export const AgendaVazia: Story = {
  name: 'Agenda vazia',
  decorators: [applicationConfig({ providers: providers(of([])) })],
};

/** A busca de pedidos falhou: alerta com "Tentar de novo", não agenda vazia. */
export const Erro: Story = {
  decorators: [applicationConfig({ providers: providers(throwError(() => new Error('offline'))) })],
};

/** Pedidos ainda carregando: skeleton no formato do card e da lista. */
export const Carregando: Story = {
  decorators: [applicationConfig({ providers: providers(NEVER) })],
};
