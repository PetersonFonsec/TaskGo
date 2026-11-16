import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { OrderDetailsPage } from './order-details.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const event = (title: string, days: number, hour: number, description?: string) => ({
  title,
  description: description ?? null,
  date: at(days, hour),
  completed: true,
});

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'AGENDADO',
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
    provider: { id: '17', name: 'Bruno Lima', photoUrl: null, ratingAvg: 4.8, ratingCount: 32, verified: true },
    client: { id: '7', name: 'Marina Souza', photoUrl: null },
    schedule: { requestedAt: at(-2, 10), scheduledFor: at(0, 14) },
    address: {
      street: 'Rua Harmonia',
      number: '123',
      complement: 'apto 41',
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      cep: '05435-000',
    },
    distanceKm: null,
    providerEarnings: null,
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: null },
    review: null,
    timeline: [
      event('Solicitação enviada', -2, 10, 'O cliente solicitou o atendimento.'),
      event('Prestador aceitou', -2, 11, 'O atendimento foi confirmado pelo prestador.'),
      event('Pagamento autorizado', -1, 9),
    ],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

function providers(order: Observable<OrderDetails>, type = 'CUSTOMER') {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
    { provide: Order, useValue: { getOrderDetails: () => order, updateOrderStatus: () => NEVER } },
    { provide: UserLoggedService, useValue: { user: () => ({ user: { id: '1', type } }) } },
  ];
}

const meta: Meta<OrderDetailsPage> = {
  title: 'Telas/Detalhes do pedido',
  component: OrderDetailsPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<OrderDetailsPage>;

/** Cliente com o Pix gerado: prazo de pagamento e "Ver QR Code". */
export const ClientePagamento: Story = {
  name: 'Cliente · pagamento pendente',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            status: 'AGUARDANDO_PAGAMENTO',
            expiresAt: at(0, 15, 40),
            payment: { method: 'PIX', status: 'PENDENTE', estimatedAmount: 120, finalAmount: null },
            timeline: [event('Solicitação enviada', -2, 10), event('Prestador aceitou', -2, 11)],
          }),
        ),
      ),
    }),
  ],
};

/** Serviço finalizado: Confirmar conclusão e Reportar problema, com as observações do prestador. */
export const ClienteConfirmacao: Story = {
  name: 'Cliente · confirmar conclusão',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
            payment: { method: 'CARTAO', status: 'AUTORIZADO', estimatedAmount: 120, finalAmount: 150 },
            completion: { providerFinishedAt: at(0, 16), providerNotes: 'Troquei o registro, que estava com vazamento.' },
            priceAdjustmentReason: 'Registro novo, fora do orçamento.',
          }),
        ),
      ),
    }),
  ],
};

/** Prestador no tema escuro: o cliente, a distância, a sua parte e "Estou a caminho". */
export const Prestador: Story = {
  name: 'Prestador · agendado',
  globals: { theme: 'PROVIDER' },
  decorators: [
    applicationConfig({
      providers: providers(
        of(details({ distanceKm: 3.2, providerEarnings: { grossAmount: 120, feePct: 0.15, feeAmount: 18, netAmount: 102 } })),
        'PRESTADOR',
      ),
    }),
  ],
};

/** Concluído e avaliado, visto pelo prestador. */
export const Concluido: Story = {
  name: 'Prestador · concluído e avaliado',
  globals: { theme: 'PROVIDER' },
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            status: 'CONCLUIDO',
            schedule: { requestedAt: at(-9, 10), scheduledFor: at(-7, 14) },
            payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
            providerEarnings: { grossAmount: 120, feePct: 0.15, feeAmount: 18, netAmount: 102 },
            review: { id: 'r1', rating: 5, comment: 'Pontual e cuidadoso.', reviewedAt: at(-6, 10) },
          }),
        ),
        'PRESTADOR',
      ),
    }),
  ],
};

/** Recusado pelo prestador, com o motivo. */
export const Cancelado: Story = {
  name: 'Cliente · recusado',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            status: 'CANCELADO',
            schedule: { requestedAt: at(-1, 10), scheduledFor: null },
            payment: null,
            cancellation: {
              reason: 'NO_AVAILABILITY',
              label: 'Sem horário disponível',
              note: 'Agenda cheia nesta semana',
              canceledAt: at(-1, 11),
            },
            timeline: [event('Solicitação enviada', -1, 10), event('Pedido cancelado', -1, 11)],
          }),
        ),
      ),
    }),
  ],
};

export const Carregando: Story = {
  name: 'Carregando',
  decorators: [applicationConfig({ providers: providers(NEVER) })],
};

export const Erro: Story = {
  name: 'Falha ao carregar',
  decorators: [
    applicationConfig({ providers: providers(throwError(() => new HttpErrorResponse({ status: 500 }))) }),
  ],
};
