import { Component, signal, type WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgOrderListComponent, TgOrderRowComponent, type TgOrderRowData } from './tg-order-row.component';
import type { TgOrderStatusAction } from './tg-order-status';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const CLIENTE: TgOrderRowData[] = [
  { id: '1041', status: 'EM_DESLOCAMENTO', service: 'Instalação de chuveiro', person: 'Marina Souza', scheduledFor: at(0, 14), neighborhood: 'Vila Madalena' },
  { id: '1042', status: 'AGUARDANDO_PAGAMENTO', service: 'Limpeza residencial', person: 'Ana Souza', scheduledFor: at(3, 9), neighborhood: 'Pinheiros' },
  { id: '1043', status: 'AGUARDANDO_CONFIRMACAO_CLIENTE', service: 'Montagem de armário', person: 'João Pereira', scheduledFor: at(-1, 10), neighborhood: 'Moema' },
  { id: '1044', status: 'CONCLUIDO', service: 'Pintura de quarto', person: 'Rafael Santos', scheduledFor: at(-13, 8), neighborhood: 'Vila Madalena' },
  { id: '1045', status: 'CANCELADO', service: 'Conserto de tomada', person: 'Carlos Lima', scheduledFor: at(-18, 16), neighborhood: 'Pinheiros' },
];

const PRESTADOR: TgOrderRowData[] = [
  { id: '2041', status: 'AGUARDANDO_APROVACAO', service: 'Limpeza residencial', person: 'Ana Clara', scheduledFor: at(5, 9), neighborhood: 'Pinheiros', distanceKm: 2.1, amount: 180 },
  { id: '2042', status: 'AGENDADO', service: 'Instalação de chuveiro', person: 'Bruno Alves', scheduledFor: at(0, 14), neighborhood: 'Vila Madalena', distanceKm: 1.2, amount: 120 },
  { id: '2043', status: 'EM_ANDAMENTO', service: 'Montagem de armário', person: 'Carla Dias', scheduledFor: at(0, 10), neighborhood: 'Moema', distanceKm: 4, amount: 260 },
  { id: '2044', status: 'AGUARDANDO_CONFIRMACAO_CLIENTE', service: 'Pintura de quarto', person: 'Diego Rocha', scheduledFor: at(-1, 15), neighborhood: 'Butantã', amount: 300 },
];

const meta: Meta<TgOrderRowComponent> = {
  title: 'Domínio/Linha de pedido',
  component: TgOrderRowComponent,
  decorators: [
    applicationConfig({ providers: [provideRouter([{ path: '**', component: PageComponent }])] }),
    moduleMetadata({ imports: [TgOrderListComponent] }),
  ],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TgOrderRowComponent>;

/** Cliente: o próximo passo só aparece quando é a vez dele (Pagar, Confirmar conclusão, Avaliar). */
export const Cliente: Story = {
  render: () => ({
    props: { orders: CLIENTE },
    template: `
      <ul tgOrderList style="max-width:880px">
        @for (o of orders; track o.id) {
          <li><tg-order-row perspective="customer" [order]="o" /></li>
        }
      </ul>`,
  }),
};

/**
 * Prestador: valor e distância. "Estou a caminho" e "Iniciar serviço" pedem
 * a troca; aqui a tela simula a API (o botão carrega e o status avança).
 */
export const Prestador: Story = {
  render: () => ({
    props: {
      // Signals: a história roda sem Zone, e o setTimeout precisa avisar a tela.
      orders: signal(PRESTADOR.map((o) => ({ ...o }))),
      busy: signal<Record<string, boolean>>({}),
      advance(
        this: { orders: WritableSignal<TgOrderRowData[]>; busy: WritableSignal<Record<string, boolean>> },
        id: string,
        status: TgOrderStatusAction,
      ) {
        this.busy.update((b) => ({ ...b, [id]: true }));
        setTimeout(() => {
          this.orders.update((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
          this.busy.update((b) => ({ ...b, [id]: false }));
        }, 800);
      },
    },
    template: `
      <ul tgOrderList style="max-width:880px">
        @for (o of orders(); track o.id) {
          <li>
            <tg-order-row
              perspective="provider"
              [order]="o"
              [busy]="!!busy()[o.id]"
              (statusAction)="advance(o.id, $event)" />
          </li>
        }
      </ul>`,
  }),
};

/** Sem data, status desconhecido, PIX pendente (Ver QR Code), pagamento autorizado e textos longos. */
export const CasosDeBorda: Story = {
  name: 'Casos de borda',
  render: () => ({
    props: {
      orders: [
        { id: '3001', status: 'STATUS_NOVO', service: 'Reparo hidráulico', person: 'Marina Souza', neighborhood: 'Pinheiros' },
        {
          id: '3002',
          status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
          service: 'Montagem de móveis planejados e reparos em geral em apartamento de três quartos',
          person: 'Maria Clara de Albuquerque Nogueira',
          scheduledFor: at(40, 11, 30),
          neighborhood: 'Jardim Paulista',
        },
        { id: '3003', status: 'CONCLUIDO', service: 'Pintura de quarto', person: 'Rafael Santos', reviewed: true, scheduledFor: at(-30, 8) },
        { id: '3004', status: 'AGUARDANDO_PAGAMENTO', service: 'Limpeza residencial', person: 'Ana Souza', paymentStatus: 'PENDENTE', scheduledFor: at(2, 9), neighborhood: 'Pinheiros' },
        { id: '3005', status: 'AGUARDANDO_PAGAMENTO', service: 'Conserto de tomada', person: 'Carlos Lima', paymentStatus: 'AUTORIZADO', scheduledFor: at(4, 16), neighborhood: 'Moema' },
      ] satisfies TgOrderRowData[],
    },
    template: `
      <ul tgOrderList style="max-width:880px">
        @for (o of orders; track o.id) {
          <li><tg-order-row perspective="customer" [order]="o" /></li>
        }
      </ul>`,
  }),
};

/** O layout segue o container: em 320 px o botão desce, mesmo numa tela larga. */
export const ContainerEstreito: Story = {
  name: 'Container estreito',
  render: () => ({
    props: { cliente: CLIENTE.slice(0, 3), prestador: PRESTADOR.slice(0, 3) },
    template: `
      <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
        <ul tgOrderList style="width:320px">
          @for (o of cliente; track o.id) {
            <li><tg-order-row perspective="customer" [order]="o" /></li>
          }
        </ul>
        <ul tgOrderList style="width:320px">
          @for (o of prestador; track o.id) {
            <li><tg-order-row perspective="provider" [order]="o" /></li>
          }
        </ul>
      </div>`,
  }),
};
