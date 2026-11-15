import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgFieldComponent } from '../field/tg-field.component';
import { TgInputDirective } from '../field/tg-input.directive';
import { TgDialogComponent } from './tg-dialog.component';
import { TgSheetComponent } from './tg-sheet.component';

const meta: Meta = {
  title: 'Componentes/Diálogo e painel',
  component: TgDialogComponent,
  decorators: [
    moduleMetadata({ imports: [TgSheetComponent, TgButtonComponent, TgFieldComponent, TgInputDirective] }),
  ],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj;

/** Decisão curta. Abaixo de 600 px as ações empilham, com a principal em cima. */
export const Confirmacao: Story = {
  name: 'Confirmação',
  render: () => ({
    template: `
      <button tgButton (click)="d.open()">Confirmar conclusão</button>
      <tg-dialog #d title="Confirmar a conclusão do serviço?" icon="check">
        <p>Depois de confirmar, o pagamento é liberado ao profissional. Isso não pode ser desfeito pelo app.</p>
        <button tgButton tgDialogAction appearance="outline" (click)="d.close()">Cancelar</button>
        <button tgButton tgDialogAction (click)="d.close()">Confirmar conclusão</button>
      </tg-dialog>`,
  }),
};

/** Decisão que não se desfaz: botão de perigo. Com "Recusar pedido", fica enviando por 2 s. */
export const Perigo: Story = {
  render: () => {
    const busy = signal(false);
    return {
      props: {
        busy,
        recusar(dialog: TgDialogComponent) {
          busy.set(true);
          setTimeout(() => {
            busy.set(false);
            dialog.close();
          }, 2000);
        },
      },
      template: `
        <button tgButton tone="danger" appearance="outline" (click)="d.open()">Recusar pedido</button>
        <tg-dialog #d title="Recusar este pedido?" icon="warning-circle" tone="danger" [busy]="busy()">
          <p>Ana Souza recebe o aviso e pode pedir a outro profissional. O pedido sai da sua lista.</p>
          <button tgButton tgDialogAction appearance="outline" (click)="d.close()">Voltar</button>
          <button tgButton tgDialogAction tone="danger" [loading]="busy()" (click)="recusar(d)">Recusar pedido</button>
        </tg-dialog>`,
    };
  },
};

/** Tarefa: bottom sheet abaixo de 600 px, lateral acima. Só o meio rola. */
export const Painel: Story = {
  render: () => ({
    template: `
      <button tgButton appearance="outline" (click)="p.open()">Filtros</button>
      <tg-sheet #p title="Filtros">
        <div style="display:flex;flex-direction:column;gap:16px">
          <tg-field label="Categoria"><input tgInput value="Hidráulica" /></tg-field>
          <tg-field label="Distância máxima" hint="Em quilômetros."><input tgInput inputmode="numeric" value="10" /></tg-field>
          <tg-field label="Bairro" optional><input tgInput /></tg-field>
          <p style="margin:0;color:var(--tg-text-secondary)">Mais filtros entram aqui; o título e as ações não saem do lugar.</p>
          <div style="height:480px"></div>
        </div>
        <button tgButton tgSheetAction appearance="outline">Limpar</button>
        <button tgButton tgSheetAction (click)="p.close()">Aplicar filtros</button>
      </tg-sheet>`,
  }),
};
