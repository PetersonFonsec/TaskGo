import { Component, signal, type WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import type { TgOrderStatusAction } from '../order-row/tg-order-status';
import { TgAppointmentCardComponent, type TgAppointmentData } from './tg-appointment-card.component';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const at = (days: number, hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const A_CAMINHO: TgAppointmentData = {
  id: '1041',
  status: 'EM_DESLOCAMENTO',
  service: 'Instalação de chuveiro',
  person: 'Marina Souza',
  scheduledFor: at(0, 14),
  address: 'Rua Harmonia, 123, apto 41',
  neighborhood: 'Vila Madalena',
};
const PAGAR: TgAppointmentData = {
  id: '1042',
  status: 'AGUARDANDO_PAGAMENTO',
  service: 'Limpeza residencial',
  person: 'Ana Souza',
  scheduledFor: at(3, 9),
  address: 'Rua dos Pinheiros, 870',
  neighborhood: 'Pinheiros',
};
const PRESTADOR: TgAppointmentData = {
  id: '2042',
  status: 'AGENDADO',
  service: 'Instalação de chuveiro',
  person: 'Bruno Alves',
  scheduledFor: at(0, 14),
  address: 'Rua Harmonia, 123, apto 41',
  neighborhood: 'Vila Madalena',
  distanceKm: 1.2,
  amount: 120,
};

const meta: Meta<TgAppointmentCardComponent> = {
  title: 'Domínio/Card de agendamento',
  component: TgAppointmentCardComponent,
  decorators: [applicationConfig({ providers: [provideRouter([{ path: '**', component: PageComponent }])] })],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TgAppointmentCardComponent>;

/** Cliente: com e sem próximo passo. O badge leva o ícone do status. */
export const Cliente: Story = {
  render: () => ({
    props: { a: A_CAMINHO, b: PAGAR },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:24px;max-width:1000px">
        <tg-appointment-card perspective="customer" [order]="a" />
        <tg-appointment-card perspective="customer" [order]="b" />
      </div>`,
  }),
};

/**
 * Prestador: valor, distância e "Estou a caminho". A tela simula a API: o
 * botão carrega e o status avança.
 */
export const Prestador: Story = {
  render: () => ({
    props: {
      // Signals: a história roda sem Zone, e o setTimeout precisa avisar a tela.
      order: signal<TgAppointmentData>({ ...PRESTADOR }),
      busy: signal(false),
      advance(
        this: { order: WritableSignal<TgAppointmentData>; busy: WritableSignal<boolean> },
        status: TgOrderStatusAction,
      ) {
        this.busy.set(true);
        setTimeout(() => {
          this.order.update((o) => ({ ...o, status }));
          this.busy.set(false);
        }, 800);
      },
    },
    template: `
      <div style="max-width:560px">
        <tg-appointment-card perspective="provider" [order]="order()" [busy]="busy()" (statusAction)="advance($event)" />
      </div>`,
  }),
};

/** Um ícone por status, o mesmo em todo lugar; desconhecido fica sem ícone. */
export const Status: Story = {
  render: () => ({
    props: {
      orders: [
        'AGUARDANDO_APROVACAO',
        'AGUARDANDO_PAGAMENTO',
        'AGENDADO',
        'EM_DESLOCAMENTO',
        'EM_ANDAMENTO',
        'AGUARDANDO_CONFIRMACAO_CLIENTE',
        'CONCLUIDO',
        'DISPUTA',
        'STATUS_NOVO',
      ].map((status, i) => ({ ...PAGAR, id: String(3000 + i), status })),
    },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:16px">
        @for (o of orders; track o.id) {
          <tg-appointment-card perspective="customer" [order]="o" />
        }
      </div>`,
  }),
};

/** Sem data, sem pessoa, foto que falha e textos longos. */
export const CasosDeBorda: Story = {
  name: 'Casos de borda',
  render: () => ({
    props: {
      orders: [
        { id: '4001', status: 'STATUS_NOVO', service: 'Reparo hidráulico', address: 'Rua dos Pinheiros, 870', neighborhood: 'Pinheiros' },
        {
          id: '4002',
          status: 'AGUARDANDO_CONFIRMACAO_CLIENTE',
          service: 'Montagem de móveis planejados e reparos em geral em apartamento de três quartos',
          person: 'Maria Clara de Albuquerque Nogueira',
          personPhotoUrl: 'https://invalid.example/foto.jpg',
          scheduledFor: at(40, 11, 30),
          address: 'Avenida Brigadeiro Faria Lima, 3477, bloco B, apartamento 1204',
          neighborhood: 'Jardim Paulista',
        },
      ] satisfies TgAppointmentData[],
    },
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr));gap:24px;max-width:1000px">
        @for (o of orders; track o.id) {
          <tg-appointment-card perspective="customer" [order]="o" />
        }
      </div>`,
  }),
};

/** O layout segue o container: em 320 px o status desce e o botão ocupa a largura. */
export const ContainerEstreito: Story = {
  name: 'Container estreito',
  render: () => ({
    props: { cliente: PAGAR, prestador: PRESTADOR },
    template: `
      <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
        <div style="width:320px"><tg-appointment-card perspective="customer" [order]="cliente" /></div>
        <div style="width:320px"><tg-appointment-card perspective="provider" [order]="prestador" /></div>
      </div>`,
  }),
};
