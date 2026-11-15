import { Component, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgAlertComponent } from './tg-alert.component';
import { TgToastRegionComponent } from './tg-toast-region.component';
import { TgToast } from './tg-toast.service';

const meta: Meta = {
  title: 'Componentes/Toast e alerta',
  component: TgAlertComponent,
  decorators: [moduleMetadata({ imports: [TgButtonComponent] })],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

/** Os quatro tons. Erro (danger) é `role="alert"`; os demais, `role="status"`. */
export const Alertas: Story = {
  render: () => ({
    template: `
      <div style="display: grid; gap: 16px; max-width: 560px">
        <tg-alert tone="info" title="Seu perfil está em análise" dismissible>
          Você pode receber pedidos assim que a análise terminar, em até 2 dias úteis.
        </tg-alert>
        <tg-alert tone="success" title="Pagamento confirmado">
          O valor fica reservado e é liberado ao profissional quando você confirmar a conclusão.
        </tg-alert>
        <tg-alert tone="warning" title="Documento vence em 5 dias">
          Envie a nova foto do documento para continuar recebendo pedidos.
          <button tgButton tgAlertAction appearance="outline" size="sm">Enviar documento</button>
        </tg-alert>
        <tg-alert tone="danger" title="Não foi possível carregar seus pedidos">
          Verifique sua conexão e tente de novo.
          <button tgButton tgAlertAction appearance="outline" size="sm">Tentar de novo</button>
        </tg-alert>
      </div>`,
  }),
};

/** Só texto, sem título. */
export const SemTitulo: Story = {
  name: 'Sem título',
  render: () => ({
    template: `<tg-alert tone="info" style="max-width: 560px">Os horários seguem o fuso de Brasília.</tg-alert>`,
  }),
};

@Component({
  selector: 'tg-toast-demo',
  imports: [TgButtonComponent, TgToastRegionComponent],
  template: `
    <div style="display: flex; flex-wrap: wrap; gap: 12px">
      <button tgButton (click)="salvo()">Salvar endereço</button>
      <button tgButton appearance="outline" (click)="cancelado()">Cancelar pedido</button>
      <button tgButton appearance="outline" (click)="info()">Copiar link</button>
    </div>
    <p style="margin-top: 16px; color: var(--tg-text-secondary)">{{ desfeito() ? 'Pedido restaurado.' : '' }}</p>
    <tg-toast-region />
  `,
})
class ToastDemoComponent {
  readonly #toast = inject(TgToast);
  readonly desfeito = signal(false);

  salvo() {
    this.#toast.show('Endereço salvo.');
  }
  cancelado() {
    this.desfeito.set(false);
    this.#toast.show('Pedido cancelado.', { action: 'Desfazer', onAction: () => this.desfeito.set(true) });
  }
  info() {
    this.#toast.show('Link copiado.', { tone: 'info' });
  }
}

/**
 * Toast claro, embaixo e no centro (acima da barra de abas no celular).
 * Fica 6 s (10 s com ação) e pausa com o mouse ou o foco em cima. Esc fecha.
 */
export const Toast: Story = {
  decorators: [moduleMetadata({ imports: [ToastDemoComponent] })],
  render: () => ({ template: `<tg-toast-demo />` }),
};
