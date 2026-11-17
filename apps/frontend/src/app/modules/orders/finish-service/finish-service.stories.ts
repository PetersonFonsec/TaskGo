import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type { FinishOrderResponse, OrderDetails } from '@shared/service/order/order.model';
import { FinishServicePage } from './finish-service.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'EM_ANDAMENTO',
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
    distanceKm: 3.2,
    providerEarnings: null,
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 120 },
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

const FINISHED: FinishOrderResponse = {
  id: '1042',
  status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
  finalPrice: 120,
  providerFinishedAt: at(0, 16),
  message: 'Conclusão enviada para o cliente confirmar.',
};

function providers(order: Observable<OrderDetails>, finish: Observable<FinishOrderResponse> = NEVER) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
    { provide: Order, useValue: { getOrderDetails: () => order, finishOrder: () => finish } },
  ];
}

/** Escreve as observações e envia, como o prestador faria. */
async function fillAndSend(canvasElement: HTMLElement) {
  const textarea = await waitFor(() => canvasElement.querySelector<HTMLTextAreaElement>('textarea'));
  textarea.value = 'Troquei o registro, que estava com vazamento, e testei o chuveiro.';
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  canvasElement.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
}

async function waitFor<T>(find: () => T | null): Promise<T> {
  for (let i = 0; i < 50; i++) {
    const found = find();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Elemento não apareceu na história.');
}

const meta: Meta<FinishServicePage> = {
  title: 'Telas/Finalizar serviço',
  component: FinishServicePage,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'PROVIDER' },
};
export default meta;

type Story = StoryObj<FinishServicePage>;

export const Carregando: Story = {
  name: 'Carregando',
  decorators: [applicationConfig({ providers: providers(NEVER) })],
};

/** Em andamento: o resumo do atendimento, o valor combinado e as observações. */
export const ProntoParaFinalizar: Story = {
  name: 'Pronto para finalizar',
  decorators: [applicationConfig({ providers: providers(of(details())) })],
};

/** "Enviar conclusão" ocupado enquanto a API responde. */
export const Enviando: Story = {
  name: 'Enviando',
  decorators: [applicationConfig({ providers: providers(of(details()), NEVER) })],
  play: ({ canvasElement }) => fillAndSend(canvasElement),
};

/** A API aceitou: confirmação e, logo depois, os detalhes do pedido. */
export const Sucesso: Story = {
  name: 'Conclusão enviada',
  decorators: [applicationConfig({ providers: providers(of(details()), of(FINISHED)) })],
  play: ({ canvasElement }) => fillAndSend(canvasElement),
};

/** Fora de "Em andamento" (aqui, agendado): não dá para finalizar. */
export const NaoPodeFinalizar: Story = {
  name: 'Não pode finalizar',
  decorators: [applicationConfig({ providers: providers(of(details({ status: 'AGENDADO' }))) })],
};

export const ErroAoCarregar: Story = {
  name: 'Falha ao carregar',
  decorators: [
    applicationConfig({ providers: providers(throwError(() => new HttpErrorResponse({ status: 500 }))) }),
  ],
};

/** A API recusou: o motivo dela, com o formulário preservado. */
export const ErroAoFinalizar: Story = {
  name: 'Falha ao finalizar',
  decorators: [
    applicationConfig({
      providers: providers(
        of(details()),
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'Somente pedidos em andamento podem ser finalizados' },
            }),
        ),
      ),
    }),
  ],
  play: ({ canvasElement }) => fillAndSend(canvasElement),
};
