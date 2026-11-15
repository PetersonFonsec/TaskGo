import type { Meta, StoryObj } from '@storybook/angular';
import { TgButtonComponent } from './tg-button.component';

type Args = TgButtonComponent & { label: string; disabled: boolean };

const meta: Meta<Args> = {
  title: 'Componentes/Botão',
  component: TgButtonComponent,
  parameters: { layout: 'padded' },
  args: {
    label: 'Solicitar serviço',
    appearance: 'solid',
    tone: 'brand',
    size: 'md',
    loading: false,
    fullWidth: false,
    disabled: false,
  },
  argTypes: {
    appearance: { control: 'inline-radio', options: ['solid', 'subtle', 'outline', 'ghost'] },
    tone: { control: 'inline-radio', options: ['brand', 'danger'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    iconStart: { control: 'select', options: [undefined, 'plus', 'calendar-blank', 'map-pin'] },
    iconEnd: { control: 'select', options: [undefined, 'arrow-right'] },
  },
  render: ({ label, ...args }) => ({
    props: args,
    template: `<button tgButton type="button" [appearance]="appearance" [tone]="tone" [size]="size"
      [loading]="loading" [fullWidth]="fullWidth" [iconStart]="iconStart" [iconEnd]="iconEnd"
      [disabled]="disabled">${label}</button>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** Use os controles para combinar aparência, tom, tamanho e estado. */
export const Playground: Story = {};

const grid = `display:grid;grid-template-columns:120px repeat(3,max-content);gap:16px 24px;align-items:center;font:700 13px var(--tg-font-sans);color:var(--tg-text-secondary)`;

/**
 * Todas as aparências nos estados padrão, carregando e desabilitado.
 * Passe o mouse e use Tab para ver hover e foco. Troque o modo na barra.
 */
export const Matriz: Story = {
  render: () => ({
    template: `
      <div style="${grid}">
        <span></span><span>Padrão</span><span>Carregando</span><span>Desabilitado</span>
        @for (row of rows; track row.label) {
          <span>{{ row.label }}</span>
          <button tgButton type="button" [appearance]="row.appearance" [tone]="row.tone">{{ row.text }}</button>
          <button tgButton type="button" [appearance]="row.appearance" [tone]="row.tone" [loading]="true">{{ row.text }}</button>
          <button tgButton type="button" [appearance]="row.appearance" [tone]="row.tone" disabled>{{ row.text }}</button>
        }
      </div>`,
    props: {
      rows: [
        { label: 'Sólido', appearance: 'solid', tone: 'brand', text: 'Solicitar' },
        { label: 'Suave', appearance: 'subtle', tone: 'brand', text: 'Remarcar' },
        { label: 'Contorno', appearance: 'outline', tone: 'brand', text: 'Cancelar' },
        { label: 'Fantasma', appearance: 'ghost', tone: 'brand', text: 'Ver detalhes' },
        { label: 'Perigo', appearance: 'solid', tone: 'danger', text: 'Cancelar pedido' },
        { label: 'Perigo fantasma', appearance: 'ghost', tone: 'danger', text: 'Excluir' },
      ],
    },
  }),
};

/** sm (36 px) só no web, em tabelas e filtros; md (44 px) é o padrão; lg (52 px) é o CTA da tela. */
export const Tamanhos: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:16px;align-items:center">
      <button tgButton type="button" size="sm" iconEnd="arrow-right">Solicitar</button>
      <button tgButton type="button" size="md" iconEnd="arrow-right">Solicitar</button>
      <button tgButton type="button" size="lg" iconEnd="arrow-right">Solicitar</button>
    </div>`,
  }),
};

/** Ícone só quando ajuda a ler. Botão só de ícone exige aria-label. */
export const ComIcones: Story = {
  name: 'Com ícones',
  render: () => ({
    template: `<div style="display:flex;gap:16px;align-items:center">
      <button tgButton type="button" iconStart="calendar-blank">Agendar</button>
      <button tgButton type="button" appearance="subtle" iconStart="map-pin">Ver no mapa</button>
      <button tgButton type="button" appearance="outline" iconStart="x" [iconOnly]="true" aria-label="Fechar"></button>
      <button tgButton type="button" appearance="ghost" tone="danger" iconStart="trash" [iconOnly]="true" aria-label="Excluir endereço"></button>
    </div>`,
  }),
};

/** No app, o botão principal da tela fica no rodapé, lg e largura total. */
export const RodapeDoApp: Story = {
  name: 'Rodapé do app',
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: () => ({
    template: `<div style="max-width:360px;display:flex;flex-direction:column;gap:12px;padding:16px;background:var(--tg-bg-surface);border-radius:var(--tg-radius-xl)">
      <button tgButton type="button" size="lg" [fullWidth]="true">Solicitar por R$ 60,00</button>
      <button tgButton type="button" size="lg" appearance="ghost" [fullWidth]="true">Falar com o profissional</button>
    </div>`,
  }),
};

/** Link com cara de botão: continua sendo um <a>, então funciona com routerLink e abre em nova aba. */
export const ComoLink: Story = {
  name: 'Como link',
  render: () => ({
    template: `<a tgButton href="#" appearance="outline" iconEnd="arrow-right">Ver todos os serviços</a>`,
  }),
};
