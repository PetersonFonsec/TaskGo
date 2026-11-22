import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type { ConfirmOrderResponse, OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ConfirmServicePage } from './confirm-service.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** Foto de exemplo, sem depender da rede. */
const photo = (label: string, hue: number) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="hsl(${hue} 40% 82%)"/>` +
      `<text x="200" y="160" font-family="sans-serif" font-size="28" text-anchor="middle" fill="hsl(${hue} 40% 30%)">${label}</text></svg>`,
  );

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
    expiresAt: null,
    service: {
      id: '3',
      title: 'Instalação de chuveiro',
      category: 'Elétrica',
      estimatedPrice: 120,
    },
    provider: {
      id: '17',
      name: 'Bruno Lima',
      photoUrl: null,
      ratingAvg: 4.8,
      ratingCount: 32,
      verified: true,
    },
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
    priceAdjustmentReason: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
    review: null,
    timeline: [],
    completion: {
      providerFinishedAt: at(0, 16, 20),
      providerNotes: 'Troquei o registro, que estava com vazamento.',
    },
    photos: [
      { id: '1', url: photo('Antes', 30), type: 'BEFORE' },
      { id: '2', url: photo('Depois', 160), type: 'AFTER' },
      { id: '3', url: photo('Nota do registro', 260), type: 'RECEIPT' },
    ],
    ...extra,
  };
}

const CONFIRMED: ConfirmOrderResponse = {
  id: '1042',
  status: 'CONCLUIDO',
  clientConfirmedAt: at(0, 17),
  payment: { status: 'PAGO', paidAt: at(0, 17) },
  message: 'Serviço confirmado com sucesso.',
};

function providers(
  order: Observable<OrderDetails>,
  confirm: Observable<ConfirmOrderResponse> = NEVER,
) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
    {
      provide: Order,
      useValue: { getOrderDetails: () => order, confirmOrderCompletion: () => confirm },
    },
    {
      provide: UserLoggedService,
      useValue: { user: () => ({ user: { id: '7', type: 'CLIENTE' } }) },
    },
  ];
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 50));
const button = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent?.trim() === label);

/** Abre o diálogo e toca em "Confirmar", como a pessoa faria. */
async function confirmInDialog({ canvasElement }: { canvasElement: HTMLElement }) {
  await tick();
  button(canvasElement, 'Confirmar conclusão')?.click();
  await tick();
  button(canvasElement, 'Confirmar')?.click();
  await tick();
}

const meta: Meta<ConfirmServicePage> = {
  title: 'Telas/Confirmar conclusão',
  component: ConfirmServicePage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<ConfirmServicePage>;

/** O prestador finalizou: resumo, valor ajustado com o motivo, pagamento e fotos. */
export const Aguardando: Story = {
  name: 'Aguardando confirmação',
  decorators: [applicationConfig({ providers: providers(of(details())) })],
};

/** Mesmo valor do orçamento, sem fotos e sem observações. */
export const SemAjuste: Story = {
  name: 'Sem ajuste e sem fotos',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
            completion: { providerFinishedAt: at(0, 16, 20), providerNotes: null },
            photos: [],
          }),
        ),
      ),
    }),
  ],
};

/** Diálogo aberto, esperando a resposta: preso até ela chegar. */
export const Enviando: Story = {
  name: 'Enviando',
  decorators: [applicationConfig({ providers: providers(of(details()), NEVER) })],
  play: confirmInDialog,
};

/** A API confirmou: pedido concluído e o próximo passo é avaliar. */
export const Confirmado: Story = {
  name: 'Confirmado',
  decorators: [applicationConfig({ providers: providers(of(details()), of(CONFIRMED)) })],
  play: confirmInDialog,
};

/** O pedido ainda está em andamento: não dá para confirmar. */
export const Indisponivel: Story = {
  name: 'Status não permite confirmar',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            status: 'EM_ANDAMENTO',
            completion: { providerFinishedAt: null, providerNotes: null },
            payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: null },
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

export const ErroAoCarregar: Story = {
  name: 'Erro ao carregar',
  decorators: [
    applicationConfig({
      providers: providers(throwError(() => new HttpErrorResponse({ status: 500 }))),
    }),
  ],
};

/** A API recusou: a mensagem dela aparece acima do resumo. */
export const ErroAoConfirmar: Story = {
  name: 'Erro ao confirmar',
  decorators: [
    applicationConfig({
      providers: providers(
        of(details()),
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Aguarde a análise do problema reportado antes de confirmar' },
            }),
        ),
      ),
    }),
  ],
  play: confirmInDialog,
};
