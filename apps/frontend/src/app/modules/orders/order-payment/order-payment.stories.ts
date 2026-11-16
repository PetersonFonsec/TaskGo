import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type { OrderDetails, OrderPaymentResponse } from '@shared/service/order/order.model';
import { OrderPaymentPage } from './order-payment.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

// QR Code ilustrativo (o real vem da API).
const QR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges"><path fill="#181625" d="M0 0h7v7H0zM14 0h7v7h-7zM0 14h7v7H0z"/><path fill="#fff" d="M1 1h5v5H1zM15 1h5v5h-5zM1 15h5v5H1z"/><path fill="#181625" d="M2 2h3v3H2zM16 2h3v3h-3zM2 16h3v3H2zM9 1h2v2H9zM8 4h1v3H8zM10 8h3v1h-3zM9 10h1v4H9zM12 12h3v1h-3zM15 9h2v2h-2zM18 12h2v2h-2zM11 15h2v3h-2zM14 16h1v4h-1zM16 18h4v1h-4zM8 18h2v2H8zM1 9h3v1H1zM5 10h2v2H5z"/></svg>',
  );

const order: OrderDetails = {
  id: '1042',
  status: 'AGUARDANDO_PAGAMENTO',
  expiresAt: null,
  service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
  provider: { id: '17', name: 'Bruno Lima', photoUrl: null },
  client: { id: '7', name: 'Marina Souza', photoUrl: null },
  schedule: { requestedAt: at(-1, 10), scheduledFor: at(1, 14) },
  address: null,
  payment: null,
  review: null,
  timeline: [],
  completion: { providerFinishedAt: null, providerNotes: null },
  priceAdjustmentReason: null,
  photos: [],
};

const pix = (extra: Partial<OrderPaymentResponse> = {}): OrderPaymentResponse => ({
  id: 'p1',
  paymentId: 'p1',
  orderId: '1042',
  method: 'PIX',
  status: 'PENDENTE',
  amount: 120,
  platformAmount: 18,
  providerAmount: 102,
  feePct: 0.15,
  pix: {
    qrCode: '00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6-7890-abcd-ef12345678905204000053039865406120.005802BR',
    qrCodeBase64: QR,
    expiresAt: inMinutes(40),
  },
  ...extra,
});

function providers(orderDetails: Observable<OrderDetails>, payment: Observable<OrderPaymentResponse>) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
    {
      provide: Order,
      useValue: {
        getOrderDetails: () => orderDetails,
        getOrderPayment: () => payment,
        createOrderPayment: () => of(pix()),
      },
    },
  ];
}

const none = () => throwError(() => new HttpErrorResponse({ status: 404 }));

const meta: Meta<OrderPaymentPage> = {
  title: 'Telas/Pagamento do pedido',
  component: OrderPaymentPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<OrderPaymentPage>;

export const PixPendente: Story = {
  name: 'Pix aguardando pagamento',
  decorators: [applicationConfig({ providers: providers(of(order), of(pix())) })],
};

export const AntesDeGerar: Story = {
  name: 'Antes de gerar o Pix',
  decorators: [applicationConfig({ providers: providers(of(order), none()) })],
};

export const Pago: Story = {
  name: 'Pago',
  decorators: [applicationConfig({ providers: providers(of(order), of(pix({ status: 'PAGO' }))) })],
};

export const Expirado: Story = {
  name: 'Pix expirado',
  decorators: [
    applicationConfig({
      providers: providers(of(order), of(pix({ pix: { qrCode: 'x', qrCodeBase64: null, expiresAt: inMinutes(-5) } }))),
    }),
  ],
};

export const Falhou: Story = {
  name: 'Pagamento não concluído',
  decorators: [applicationConfig({ providers: providers(of(order), of(pix({ status: 'FALHOU' }))) })],
};

export const Carregando: Story = {
  name: 'Carregando',
  decorators: [applicationConfig({ providers: providers(NEVER, NEVER) })],
};

export const Erro: Story = {
  name: 'Falha ao carregar',
  decorators: [applicationConfig({ providers: providers(throwError(() => new HttpErrorResponse({ status: 500 })), none()) })],
};
