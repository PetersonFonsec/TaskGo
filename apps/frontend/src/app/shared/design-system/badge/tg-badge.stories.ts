import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgCardComponent } from '../card/tg-card.component';
import { TgBadgeComponent } from './tg-badge.component';

type Args = TgBadgeComponent & { text: string };

const meta: Meta<Args> = {
  title: 'Componentes/Badge de status',
  component: TgBadgeComponent,
  decorators: [moduleMetadata({ imports: [TgCardComponent] })],
  parameters: { layout: 'padded' },
  args: { tone: 'confirmed', icon: undefined, text: 'Agendado' },
  argTypes: {
    tone: {
      control: 'select',
      options: ['waiting', 'confirmed', 'progress', 'done', 'cancelled', 'neutral', 'accent'],
    },
    icon: { control: 'select', options: [undefined, 'map-pin', 'check', 'calendar-blank'] },
  },
  render: (args) => ({
    props: args,
    template: `<tg-badge [tone]="tone" [icon]="icon">{{ text }}</tg-badge>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** Use os controles para ver os tons e o ícone. */
export const Playground: Story = {};

/** Os sete tons (troque o modo na barra para ver o prestador). */
export const Tons: Story = {
  render: () => ({
    template: `<div style="display:flex;flex-wrap:wrap;gap:12px">
      <tg-badge tone="waiting">Aguardando</tg-badge>
      <tg-badge tone="confirmed">Confirmado</tg-badge>
      <tg-badge tone="progress">Em andamento</tg-badge>
      <tg-badge tone="done">Concluído</tg-badge>
      <tg-badge tone="cancelled">Cancelado</tg-badge>
      <tg-badge>Principal</tg-badge>
      <tg-badge tone="accent">Novo no TaskGo</tg-badge>
    </div>`,
  }),
};

const ORDER = [
  ['AGUARDANDO_APROVACAO', 'Aguardando o profissional', 'Aguardando sua resposta', 'waiting'],
  ['AGUARDANDO_PAGAMENTO', 'Aguardando pagamento', 'Aguardando pagamento', 'waiting'],
  ['AGENDADO', 'Agendado', 'Agendado', 'confirmed'],
  ['EM_DESLOCAMENTO', 'Profissional a caminho', 'A caminho', 'progress'],
  ['EM_ANDAMENTO', 'Em andamento', 'Em andamento', 'progress'],
  ['AGUARDANDO_CONFIRMACAO_CLIENTE', 'Aguardando sua confirmação', 'Aguardando o cliente', 'waiting'],
  ['CONCLUIDO', 'Concluído', 'Concluído', 'done'],
  ['DISPUTA', 'Em análise', 'Em análise', 'waiting'],
  ['REJEITADO', 'Recusado', 'Recusado', 'cancelled'],
  ['CANCELADO', 'Cancelado', 'Cancelado', 'cancelled'],
  ['(desconhecido)', 'Em atualização', 'Em atualização', 'neutral'],
];

/**
 * Mapa aprovado dos 10 status do pedido em 5 tons. A coluna do prestador
 * muda o texto só onde a frase do cliente não serve para ele.
 */
export const StatusDoPedido: Story = {
  name: 'Status do pedido',
  render: () => ({
    props: { rows: ORDER },
    template: `<table style="border-collapse:collapse;font-size:14px">
      <tr><th style="text-align:left;padding:6px 12px">Status</th><th style="text-align:left;padding:6px 12px">Cliente</th><th style="text-align:left;padding:6px 12px">Prestador</th></tr>
      @for (r of rows; track r[0]) {
        <tr>
          <td style="padding:6px 12px"><code>{{ r[0] }}</code></td>
          <td style="padding:6px 12px"><tg-badge [tone]="$any(r[3])">{{ r[1] }}</tg-badge></td>
          <td style="padding:6px 12px"><tg-badge [tone]="$any(r[3])">{{ r[2] }}</tg-badge></td>
        </tr>
      }
    </table>`,
  }),
};

/** Dentro de um card: o status com ícone, sem mudar o nome lido pelo leitor de tela. */
export const NoCard: Story = {
  name: 'No card',
  render: () => ({
    template: `<tg-card style="max-width:360px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <strong style="font-size:14px">Ter, 18 nov · 14h</strong>
        <tg-badge tone="progress" icon="map-pin">Profissional a caminho</tg-badge>
      </div>
      <h3 style="margin:12px 0 4px;font-size:16px">Instalação de chuveiro</h3>
      <span style="color:var(--tg-text-secondary);font-size:14px">Marina Souza · Rua Harmonia, 120</span>
    </tg-card>`,
  }),
};
