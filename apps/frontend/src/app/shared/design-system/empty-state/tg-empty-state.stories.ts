import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgEmptyStateComponent } from './tg-empty-state.component';

const surface = 'background:var(--tg-bg-surface);border:1px solid var(--tg-border-default);border-radius:20px;max-width:560px';

const meta: Meta<TgEmptyStateComponent> = {
  title: 'Componentes/Estado vazio',
  component: TgEmptyStateComponent,
  decorators: [moduleMetadata({ imports: [TgButtonComponent] })],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TgEmptyStateComponent>;

/** Primeiro uso: a lista é o assunto da tela. A ação principal leva ao começo. */
export const PrimeiroUso: Story = {
  name: 'Primeiro uso',
  render: () => ({
    template: `
      <div style="${surface}">
        <tg-empty-state icon="receipt" title="Você ainda não fez nenhum pedido">
          Encontre um profissional e agende em poucos passos.
          <button tgButton tgEmptyAction>Buscar profissionais</button>
        </tg-empty-state>
      </div>`,
  }),
};

/** Busca sem resultado: a ação, de contorno, desfaz o filtro. */
export const BuscaSemResultado: Story = {
  name: 'Busca sem resultado',
  render: () => ({
    template: `
      <div style="${surface}">
        <tg-empty-state icon="magnifying-glass" title="Nenhum profissional com esses filtros">
          Tente outra região ou tire alguns filtros.
          <button tgButton tgEmptyAction appearance="outline">Limpar filtros</button>
        </tg-empty-state>
      </div>`,
  }),
};

/** Sem ação quando não há o que fazer. */
export const SemAcao: Story = {
  name: 'Sem ação',
  render: () => ({
    template: `
      <div style="${surface}">
        <tg-empty-state icon="wallet" title="Nenhum recebimento ainda">
          Os valores dos serviços concluídos aparecem aqui, com a data do depósito.
        </tg-empty-state>
      </div>`,
  }),
};

/** Compacto, dentro de uma seção. Abaixo de 600 px, a ação desce. */
export const Compacto: Story = {
  render: () => ({
    template: `
      <div style="display:grid;gap:12px;max-width:640px">
        <tg-empty-state compact icon="calendar-blank" title="Sua agenda está livre" level="3">
          Quando você contratar um serviço, ele aparece aqui.
        </tg-empty-state>
        <tg-empty-state compact icon="map-pin" title="Nenhum endereço cadastrado" level="3">
          Adicione um endereço para contratar perto de você.
          <button tgButton tgEmptyAction appearance="outline" size="sm">Adicionar</button>
        </tg-empty-state>
      </div>`,
  }),
};
