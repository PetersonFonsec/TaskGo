import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Order } from '@shared/service/order/order';
import type {
  CreateReviewResponse,
  OrderDetails,
  ReviewTag,
} from '@shared/service/order/order.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ReviewOrderPage } from './review-order.page';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const TAGS: ReviewTag[] = [
  { id: '1', name: 'Pontual', slug: 'pontual' },
  { id: '2', name: 'Caprichoso', slug: 'caprichoso' },
  { id: '3', name: 'Preço justo', slug: 'preco-justo' },
  { id: '4', name: 'Educado', slug: 'educado' },
  { id: '5', name: 'Deixou tudo limpo', slug: 'deixou-tudo-limpo' },
];

const COMMENT = 'Chegou no horário, explicou o que ia fazer e deixou tudo limpo.';

function details(extra: Partial<OrderDetails> = {}): OrderDetails {
  return {
    id: '1042',
    status: 'CONCLUIDO',
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
    schedule: { requestedAt: '2026-11-12T13:00:00.000Z', scheduledFor: '2026-11-14T17:00:00.000Z' },
    address: null,
    distanceKm: null,
    providerEarnings: null,
    cancellation: null,
    payment: { method: 'PIX', status: 'PAGO', estimatedAmount: 120, finalAmount: 150 },
    review: null,
    timeline: [],
    completion: { providerFinishedAt: '2026-11-14T19:30:00.000Z', providerNotes: null },
    priceAdjustmentReason: null,
    photos: [],
    ...extra,
  };
}

const RESPONSE: CreateReviewResponse = {
  id: '9',
  orderId: '1042',
  rating: 5,
  comment: COMMENT,
  reviewedAt: '2026-11-15T12:00:00.000Z',
  tags: TAGS.slice(0, 2),
  provider: { id: '17', ratingAvg: 4.8, ratingCount: 33 },
};

function providers(
  order: Observable<OrderDetails>,
  review: Observable<CreateReviewResponse> = NEVER,
  tags: Observable<ReviewTag[]> = of(TAGS),
) {
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    {
      provide: ActivatedRoute,
      useValue: { paramMap: of(convertToParamMap({ id: '1042' })), snapshot: {} },
    },
    {
      provide: Order,
      useValue: {
        getOrderDetails: () => order,
        getReviewTags: () => tags,
        createReview: () => review,
      },
    },
    {
      provide: UserLoggedService,
      useValue: { user: () => ({ user: { id: '7', type: 'CUSTOMER' } }) },
    },
  ];
}

const until = async (find: () => Element | null): Promise<Element> => {
  for (let i = 0; i < 50; i++) {
    const el = find();
    if (el) return el;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('Elemento não apareceu na história');
};

/** Preenche como a pessoa: 5 estrelas, duas tags e o comentário. */
async function fill(canvas: HTMLElement): Promise<void> {
  const star = (await until(
    () => canvas.querySelectorAll('input[name=rating]')[4] ?? null,
  )) as HTMLInputElement;
  star.click();
  const chips = canvas.querySelectorAll<HTMLButtonElement>('.review__chip');
  chips[0]?.click();
  chips[4]?.click();
  const box = canvas.querySelector<HTMLTextAreaElement>('textarea')!;
  box.value = COMMENT;
  box.dispatchEvent(new Event('input'));
}

async function send(canvas: HTMLElement): Promise<void> {
  canvas.querySelector<HTMLButtonElement>('button[type=submit]')?.click();
}

const meta: Meta<ReviewOrderPage> = {
  title: 'Telas/Avaliar',
  component: ReviewOrderPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<ReviewOrderPage>;

/** O formulário vazio: nota, destaques e comentário. */
export const Formulario: Story = {
  name: 'Formulário',
  decorators: [applicationConfig({ providers: providers(of(details())) })],
};

/** Nota 5, duas tags e comentário, antes de enviar. */
export const Preenchido: Story = {
  decorators: [applicationConfig({ providers: providers(of(details())) })],
  play: async ({ canvasElement }) => fill(canvasElement),
};

/** "Enviar avaliação" sem nota: a mensagem aparece abaixo das estrelas e o foco vai para elas. */
export const ErrosDeValidacao: Story = {
  name: 'Erros de validação',
  decorators: [applicationConfig({ providers: providers(of(details())) })],
  play: async ({ canvasElement }) => {
    await until(() => canvasElement.querySelector('button[type=submit]'));
    await send(canvasElement);
  },
};

export const Enviando: Story = {
  decorators: [applicationConfig({ providers: providers(of(details()), NEVER) })],
  play: async ({ canvasElement }) => {
    await fill(canvasElement);
    await send(canvasElement);
  },
};

export const Enviado: Story = {
  name: 'Enviado com sucesso',
  decorators: [applicationConfig({ providers: providers(of(details()), of(RESPONSE)) })],
  play: async ({ canvasElement }) => {
    await fill(canvasElement);
    await send(canvasElement);
  },
};

export const ErroAoEnviar: Story = {
  name: 'Erro ao enviar',
  decorators: [
    applicationConfig({
      providers: providers(
        of(details()),
        throwError(() => new HttpErrorResponse({ status: 500 })),
      ),
    }),
  ],
  play: async ({ canvasElement }) => {
    await fill(canvasElement);
    await send(canvasElement);
  },
};

/** O pedido já tem avaliação: mostra a nota e o comentário, sem formulário. */
export const JaAvaliado: Story = {
  name: 'Já avaliado',
  decorators: [
    applicationConfig({
      providers: providers(
        of(
          details({
            review: {
              id: '9',
              rating: 4,
              comment: COMMENT,
              reviewedAt: '2026-11-15T12:00:00.000Z',
            },
          }),
        ),
      ),
    }),
  ],
};

/** Ainda em curso (aqui, esperando o cliente confirmar a conclusão). */
export const NaoConcluido: Story = {
  name: 'Pedido não concluído',
  decorators: [
    applicationConfig({
      providers: providers(of(details({ status: 'AGUARDANDO_CONFIRMACAO_CLIENTE' }))),
    }),
  ],
};

export const Cancelado: Story = {
  name: 'Pedido cancelado',
  decorators: [applicationConfig({ providers: providers(of(details({ status: 'CANCELADO' }))) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: providers(NEVER, NEVER, NEVER) })],
};

export const ErroAoCarregar: Story = {
  name: 'Erro ao carregar',
  decorators: [
    applicationConfig({
      providers: providers(throwError(() => new HttpErrorResponse({ status: 500 }))),
    }),
  ],
};
