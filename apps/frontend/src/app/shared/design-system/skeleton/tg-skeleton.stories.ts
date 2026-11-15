import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from './tg-loading.component';
import { TgSkeletonComponent } from './tg-skeleton.component';

const card = 'display:flex;gap:14px;align-items:center;padding:16px;background:var(--tg-bg-surface);border:1px solid var(--tg-border-default);border-radius:16px';

const meta: Meta<TgSkeletonComponent> = {
  title: 'Componentes/Skeleton',
  component: TgSkeletonComponent,
  decorators: [moduleMetadata({ imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgButtonComponent] })],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TgSkeletonComponent>;

/** Texto, parágrafo, círculo e bloco. Com movimento reduzido, o pulso para. */
export const Pecas: Story = {
  name: 'Peças',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:24px;align-items:end;max-width:760px">
        <tg-skeleton width="80%" />
        <tg-skeleton [lines]="3" />
        <tg-skeleton shape="circle" size="56" />
        <div style="display:flex;gap:8px;align-items:end">
          <tg-skeleton shape="rect" width="120" height="80" />
          <tg-skeleton shape="rect" width="72" height="28" radius="full" />
        </div>
      </div>`,
  }),
};

/** O skeleton repete as medidas do card real, para a tela não pular. */
export const CardDePedido: Story = {
  name: 'Card de pedido',
  render: () => ({
    template: `
      <div style="display:grid;gap:12px;max-width:560px">
        <div style="${card}">
          <tg-skeleton shape="rect" width="48" height="48" radius="md" />
          <div style="flex:1;display:grid;gap:10px">
            <tg-skeleton width="62%" height="12" />
            <tg-skeleton width="44%" height="12" />
          </div>
        </div>
        <div style="${card}">
          <span style="width:48px;height:48px;border-radius:12px;background:var(--tg-action-subtle)"></span>
          <div style="flex:1;display:grid;gap:4px">
            <strong style="font-size:15px">Instalação de chuveiro</strong>
            <span style="font-size:13px;color:var(--tg-text-secondary)">Ana Souza · Qui, 19 nov · 14h</span>
          </div>
        </div>
      </div>`,
  }),
};

@Component({
  selector: 'tg-loading-demo',
  imports: [TgLoadingComponent, TgLoadingSkeletonDirective, TgSkeletonComponent, TgButtonComponent],
  template: `
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <button tgButton appearance="outline" (click)="load(2000)">Recarregar (2 s)</button>
      <button tgButton appearance="outline" (click)="load(150)">Recarregar rápido (150 ms)</button>
    </div>
    <tg-loading label="Carregando pedidos" [loading]="loading()" style="max-width:560px">
      <ng-template tgLoadingSkeleton>
        <div style="display:grid;gap:12px">
          @for (i of [1, 2, 3]; track i) {
            <div style="${card}">
              <tg-skeleton shape="rect" width="48" height="48" radius="md" />
              <div style="flex:1;display:grid;gap:10px">
                <tg-skeleton width="62%" height="12" />
                <tg-skeleton width="44%" height="12" />
              </div>
              <tg-skeleton shape="rect" width="72" height="24" radius="full" />
            </div>
          }
        </div>
      </ng-template>
      <ul style="list-style:none;margin:0;padding:0;display:grid;gap:12px">
        @for (item of items; track item) {
          <li style="${card}">
            <span style="width:48px;height:48px;border-radius:12px;background:var(--tg-action-subtle)"></span>
            <div style="flex:1;display:grid;gap:4px">
              <strong style="font-size:15px">{{ item }}</strong>
              <span style="font-size:13px;color:var(--tg-text-secondary)">Qui, 19 nov · 14h</span>
            </div>
          </li>
        }
      </ul>
    </tg-loading>
  `,
})
class LoadingDemoComponent {
  readonly loading = signal(true);
  readonly items = ['Instalação de chuveiro', 'Limpeza pós-obra', 'Troca de tomada'];
  constructor() {
    this.load(2000);
  }
  load(ms: number) {
    this.loading.set(true);
    setTimeout(() => this.loading.set(false), ms);
  }
}

/**
 * Região que carrega: o skeleton só aparece depois de 300 ms, e o leitor de
 * tela ouve "Carregando pedidos" uma vez. No recarregar rápido, nada pisca.
 */
export const Carregando: Story = {
  decorators: [moduleMetadata({ imports: [LoadingDemoComponent] })],
  render: () => ({ template: `<tg-loading-demo />` }),
};
