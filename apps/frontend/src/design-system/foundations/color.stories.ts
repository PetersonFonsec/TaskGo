import type { Meta, StoryObj } from '@storybook/angular';
import { foundationStyles } from './foundation.styles';

interface Token {
  name: string;
  note?: string;
}

const tokens = (prefix: string, steps: (string | number)[]): Token[] =>
  steps.map((step) => ({ name: `--tg-${prefix}-${step}` }));

const swatches = `
  <div class="grid">
    @for (token of list; track token.name) {
      <div class="swatch">
        <div class="chip" [style.background]="'var(' + token.name + ')'"></div>
        <div class="meta">
          <span class="name">{{ token.name }}</span>
          @if (token.note) { <span class="note">{{ token.note }}</span> }
        </div>
      </div>
    }
  </div>`;

const meta: Meta = {
  title: 'Fundamentos/Cor',
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj;

const semantic: Token[] = [
  { name: '--tg-bg-canvas', note: 'Fundo da página' },
  { name: '--tg-bg-surface', note: 'Cartões e painéis' },
  { name: '--tg-bg-subtle', note: 'Áreas de apoio' },
  { name: '--tg-text-primary', note: 'Texto principal' },
  { name: '--tg-text-secondary', note: 'Texto de apoio' },
  { name: '--tg-text-disabled', note: 'Desabilitado' },
  { name: '--tg-border-default', note: 'Divisórias' },
  { name: '--tg-border-strong', note: 'Borda de campo' },
  { name: '--tg-action-primary', note: 'Botão principal' },
  { name: '--tg-action-primary-hover', note: 'Hover do principal' },
  { name: '--tg-action-subtle', note: 'Fundo de ação suave' },
  { name: '--tg-accent', note: 'Destaque (só preenchimento)' },
  { name: '--tg-focus-ring', note: 'Anel de foco' },
];

/** O que a interface usa. Troque o modo na barra para ver o prestador. */
export const Semanticas: Story = {
  name: 'Semânticas',
  render: () => ({
    props: { list: semantic },
    styles: [foundationStyles],
    template: `<div class="page"><h2>Cores semânticas</h2>
      <p>Componentes usam só estes tokens. O modo prestador troca os valores, não os nomes.</p>
      ${swatches}</div>`,
  }),
};

const statuses = [
  { label: 'Aguardando profissional', key: 'waiting' },
  { label: 'Confirmado', key: 'confirmed' },
  { label: 'Em andamento', key: 'progress' },
  { label: 'Concluído', key: 'done' },
  { label: 'Cancelado', key: 'cancelled' },
];

/** Status do pedido, ligados às cores de feedback. */
export const StatusDoPedido: Story = {
  name: 'Status do pedido',
  render: () => ({
    props: { statuses },
    styles: [
      foundationStyles,
      `.pill { font: 700 14px/20px var(--tg-font-sans); padding: 6px 12px; border-radius: var(--tg-radius-full); }`,
    ],
    template: `<div class="page"><h2>Status do pedido</h2>
      <div style="display:flex; flex-wrap:wrap; gap: var(--tg-space-3)">
        @for (s of statuses; track s.key) {
          <span class="pill"
            [style.color]="'var(--tg-status-' + s.key + '-text)'"
            [style.background]="'var(--tg-status-' + s.key + '-bg)'">{{ s.label }}</span>
        }
      </div></div>`,
  }),
};

const primitives = [
  { title: 'Violeta (marca)', list: tokens('violet', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) },
  { title: 'Tinta (neutros)', list: tokens('ink', [0, 25, 100, 200, 300, 400, 500, 600, 700, 800, 900]) },
  { title: 'Lima (acento)', list: tokens('lime', [100, 200, 300]) },
  { title: 'Noite (modo prestador)', list: tokens('night', [900, 800, 700, 50]) },
];

/** Valores crus. Não use direto em componente. */
export const Primitivas: Story = {
  render: () => ({
    props: { groups: primitives },
    styles: [foundationStyles],
    template: `<div class="page"><h2>Primitivas</h2>
      <p>Base das semânticas. Componentes não devem ler estes tokens direto.</p>
      @for (group of groups; track group.title) {
        <strong>{{ group.title }}</strong>
        <div class="grid">
          @for (token of group.list; track token.name) {
            <div class="swatch">
              <div class="chip" [style.background]="'var(' + token.name + ')'"></div>
              <div class="meta"><span class="name">{{ token.name }}</span></div>
            </div>
          }
        </div>
      }</div>`,
  }),
};
