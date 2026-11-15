import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgBadgeComponent } from '../badge/tg-badge.component';
import { TgCardComponent } from '../card/tg-card.component';
import { TgTabComponent, TgTabsComponent } from './tg-tabs.component';

type Args = { value: string; width: number };

const meta: Meta<Args> = {
  title: 'Componentes/Abas',
  component: TgTabsComponent,
  decorators: [moduleMetadata({ imports: [TgTabComponent, TgCardComponent, TgBadgeComponent] })],
  parameters: { layout: 'padded' },
  args: { value: 'ativos', width: 720 },
  argTypes: {
    value: { control: 'select', options: ['ativos', 'concluidos', 'cancelados'] },
    width: { control: { type: 'range', min: 240, max: 1000, step: 20 } },
  },
};
export default meta;

type Story = StoryObj<Args>;

const order = (title: string, detail: string, tone: string, status: string) => `
  <tg-card dense style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <span style="display:flex;flex-direction:column;gap:4px">
        <b>${title}</b><span style="color:var(--tg-text-secondary);font-size:14px">${detail}</span>
      </span>
      <tg-badge tone="${tone}">${status}</tg-badge>
    </div>
  </tg-card>`;

/** Pedidos do cliente. Setas, Home e End trocam de aba; troque o modo na barra. */
export const Cliente: Story = {
  render: (args) => ({
    props: args,
    template: `<div [style.max-width.px]="width">
      <tg-tabs label="Pedidos" [(value)]="value">
        <tg-tab value="ativos" label="Ativos" [count]="2">
          ${order('Instalação de chuveiro', 'Qui, 19 nov · 14h', 'confirmed', 'Agendado')}
          ${order('Limpeza pós-obra', 'Hoje · 9h', 'progress', 'Em andamento')}
        </tg-tab>
        <tg-tab value="concluidos" label="Concluídos">
          ${order('Montagem de armário', 'Sex, 6 nov', 'done', 'Concluído')}
        </tg-tab>
        <tg-tab value="cancelados" label="Cancelados">
          ${order('Troca de fechadura', 'Seg, 2 nov', 'cancelled', 'Cancelado')}
        </tg-tab>
      </tg-tabs>
    </div>`,
  }),
};

/** Pedidos do prestador, com contagem em Solicitações. */
export const Prestador: Story = {
  render: () => ({
    template: `<div style="max-width:720px">
      <tg-tabs label="Pedidos">
        <tg-tab value="solicitacoes" label="Solicitações" [count]="3">
          ${order('Troca de tomada', 'Ana Souza · Sex, 20 nov', 'waiting', 'Aguardando sua resposta')}
          ${order('Pintura de quarto', 'Bruno Lima · Sáb, 21 nov', 'waiting', 'Aguardando sua resposta')}
          ${order('Conserto de torneira', 'Carla Dias · Seg, 23 nov', 'waiting', 'Aguardando sua resposta')}
        </tg-tab>
        <tg-tab value="agendados" label="Agendados" [count]="12">
          ${order('Instalação de chuveiro', 'Qui, 19 nov · 14h', 'confirmed', 'Agendado')}
        </tg-tab>
        <tg-tab value="historico" label="Histórico">
          ${order('Montagem de armário', 'Sex, 6 nov', 'done', 'Concluído')}
        </tg-tab>
      </tg-tabs>
    </div>`,
  }),
};

/** 360 px com quatro abas: a barra rola, com esmaecido onde há mais abas. */
export const BarraEstreita: Story = {
  name: 'Barra estreita',
  render: () => ({
    template: `<div style="width:328px">
      <tg-tabs label="Perfil do profissional" value="avaliacoes">
        <tg-tab value="servicos" label="Serviços"><p>Serviços oferecidos.</p></tg-tab>
        <tg-tab value="avaliacoes" label="Avaliações" [count]="48"><p>48 avaliações.</p></tg-tab>
        <tg-tab value="sobre" label="Sobre"><p>Sobre o profissional.</p></tg-tab>
        <tg-tab value="fotos" label="Fotos"><p>Fotos dos trabalhos.</p></tg-tab>
      </tg-tabs>
    </div>`,
  }),
};
