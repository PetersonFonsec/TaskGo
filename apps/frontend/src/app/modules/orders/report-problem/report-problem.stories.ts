import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { Order } from '@shared/service/order/order';
import type { OrderDetails } from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { type OrderDispute, ReportProblemPage } from './report-problem.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

function details(status = 'AGUARDANDO_CONFIRMACAO_CLIENTE'): OrderDetails {
  return {
    id: '1042',
    status,
    expiresAt: null,
    service: { id: '3', title: 'Instalação de chuveiro', category: 'Elétrica', estimatedPrice: 120 },
    provider: { id: '17', name: 'Bruno Lima', photoUrl: null, ratingAvg: 4.8, ratingCount: 32, verified: true },
    client: { id: '7', name: 'Marina Souza', photoUrl: null },
    schedule: { requestedAt: at(-2, 10), scheduledFor: at(0, 14) },
    address: null,
    cancellation: null,
    payment: null,
    review: null,
    timeline: [],
    completion: { providerFinishedAt: null, providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
  };
}

const OPEN_CASE: OrderDispute = {
  id: '58',
  orderId: '1042',
  openedBy: 'CLIENTE',
  openedById: '7',
  reason: 'Serviço incompleto',
  description:
    'O chuveiro foi instalado, mas a resistência não esquenta. O prestador saiu antes de testar com a água ligada.',
  status: 'UNDER_REVIEW',
  resolution: null,
  resolvedAt: null,
  createdAt: at(0, 15),
};

const CLOSED_CASE: OrderDispute = {
  id: '41',
  orderId: '1042',
  openedBy: 'PRESTADOR',
  openedById: '17',
  reason: 'Endereço sem acesso',
  description: 'Cheguei no horário e a portaria não liberou a entrada. Esperei 20 minutos.',
  status: 'RESOLVED',
  resolution: 'Falamos com a cliente e o acesso foi liberado. O atendimento seguiu normalmente.',
  resolvedAt: at(-1, 11),
  createdAt: at(-1, 9),
};

const later = <T>(value: T) => of(value).pipe(delay(400));
const failing = <T>(error: unknown = new Error('offline')) =>
  throwError(() => error).pipe(delay(400)) as Observable<T>;

interface Api {
  order?: Observable<OrderDetails>;
  /** Respostas do GET dos casos, uma por chamada (a última se repete). */
  disputes?: Observable<OrderDispute[]>[];
  post?: Observable<OrderDispute>;
  /** Quem está vendo: o cliente (7) ou o prestador (17). */
  user?: { id: string; type: 'CUSTOMER' | 'PROVIDER' };
}

function screen({
  order = later(details()),
  disputes = [later([])],
  post = later(OPEN_CASE),
  user = { id: '7', type: 'CUSTOMER' },
}: Api) {
  let calls = 0;
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1042' })) } },
    { provide: Order, useValue: { getOrderDetails: () => order } },
    { provide: UserLoggedService, useValue: { user: () => ({ user }) } },
    {
      provide: HttpClient,
      useValue: {
        get: () => disputes[Math.min(calls++, disputes.length - 1)],
        post: () => post,
      },
    },
  ];
}

/** Espera o formulário (os dados chegam depois de um instante). */
async function form(canvas: HTMLElement): Promise<HTMLFormElement> {
  for (let i = 0; i < 50; i++) {
    const found = canvas.querySelector<HTMLFormElement>('form#problem-form');
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Formulário não apareceu');
}

function fill(canvas: HTMLElement, name: string, value: string) {
  const field = canvas.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Preenche um problema válido e envia. */
async function sendValid({ canvasElement }: { canvasElement: HTMLElement }) {
  const element = await form(canvasElement);
  fill(canvasElement, 'reason', 'Serviço incompleto');
  fill(canvasElement, 'description', OPEN_CASE.description);
  element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
}

const meta: Meta<ReportProblemPage> = {
  title: 'Telas/Reportar problema',
  component: ReportProblemPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<ReportProblemPage>;

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen({ order: NEVER, disputes: [NEVER] }) })],
};

/** Cliente com o serviço aguardando a confirmação, sem casos abertos. */
export const Formulario: Story = {
  name: 'Formulário',
  decorators: [applicationConfig({ providers: screen({}) })],
};

/** "Enviar para análise" com os campos vazios. */
export const ErrosDeValidacao: Story = {
  name: 'Erros de validação',
  decorators: [applicationConfig({ providers: screen({}) })],
  play: async ({ canvasElement }) => {
    const element = await form(canvasElement);
    fill(canvasElement, 'reason', 'ab');
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  },
};

export const Enviando: Story = {
  decorators: [applicationConfig({ providers: screen({ post: NEVER }) })],
  play: sendValid,
};

/** Depois do envio: aviso de sucesso e o caso novo, sem o formulário. */
export const Enviado: Story = {
  decorators: [applicationConfig({ providers: screen({ disputes: [later([]), later([OPEN_CASE])] }) })],
  play: sendValid,
};

export const ErroAoEnviar: Story = {
  name: 'Erro ao enviar',
  decorators: [
    applicationConfig({
      providers: screen({
        post: failing(
          new HttpErrorResponse({
            status: 400,
            error: {
              statusCode: 400,
              message: ['Problemas podem ser reportados durante ou após o atendimento, antes da confirmação'],
            },
          }),
        ),
      }),
    }),
  ],
  play: sendValid,
};

/** Já existe um caso em análise: sem formulário, com o caso e o histórico. */
export const JaReportado: Story = {
  name: 'Problema já reportado',
  decorators: [applicationConfig({ providers: screen({ disputes: [later([OPEN_CASE, CLOSED_CASE])] }) })],
};

/** Caso anterior resolvido: o formulário volta e o histórico mostra a resposta. Modo prestador. */
export const ComHistorico: Story = {
  name: 'Com caso resolvido (prestador)',
  globals: { theme: 'PROVIDER' },
  decorators: [
    applicationConfig({ providers: screen({
        order: later(details('EM_ANDAMENTO')),
        disputes: [later([CLOSED_CASE])],
        user: { id: '17', type: 'PROVIDER' },
      }), }),
  ],
};

export const NaoPermite: Story = {
  name: 'Pedido não permite reportar',
  decorators: [applicationConfig({ providers: screen({ order: later(details('AGENDADO')) }) })],
};

export const ErroAoCarregar: Story = {
  name: 'Erro ao carregar',
  decorators: [applicationConfig({ providers: screen({ order: failing(), disputes: [failing()] }) })],
};

export const NaoEncontrado: Story = {
  name: 'Pedido não encontrado',
  decorators: [
    applicationConfig({
      providers: screen({ order: failing(new HttpErrorResponse({ status: 404 })), disputes: [failing()] }),
    }),
  ],
};
