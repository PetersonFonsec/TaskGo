import { FormsModule } from '@angular/forms';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgButtonComponent } from '../button/tg-button.component';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgCardComponent, TgCardLinkDirective } from './tg-card.component';

const meta: Meta<TgCardComponent> = {
  title: 'Componentes/Card',
  component: TgCardComponent,
  decorators: [
    moduleMetadata({ imports: [TgCardLinkDirective, TgButtonComponent, TgIconComponent, FormsModule] }),
  ],
  parameters: { layout: 'padded' },
  args: { appearance: 'outlined', dense: false },
  argTypes: {
    appearance: { control: 'inline-radio', options: ['outlined', 'elevated', 'subtle'] },
    indicator: { table: { disable: true } },
  },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:320px">
      <tg-card [appearance]="appearance" [dense]="dense">
        <strong style="display:block;font-size:16px;line-height:22px">Limpeza residencial</strong>
        <span style="color:var(--tg-text-secondary);font-size:14px">Diarista, faxina pesada e pós-obra</span>
      </tg-card>
    </div>`,
  }),
};
export default meta;

type Story = StoryObj<TgCardComponent>;

/** Use os controles para ver as três aparências e o padding denso. */
export const Playground: Story = {};

const text = (title: string) => `
  <strong style="display:block;font-size:16px;line-height:22px">${title}</strong>
  <span style="color:var(--tg-text-secondary);font-size:14px">Elétrica, hidráulica e montagem</span>`;

/** Contorno é o padrão; elevado só para destaque (no prestador vira borda). */
export const Aparencias: Story = {
  name: 'Aparências',
  render: () => ({
    template: `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,260px));gap:24px">
      <tg-card>${text('Contorno')}</tg-card>
      <tg-card appearance="elevated">${text('Elevado')}</tg-card>
      <tg-card appearance="subtle">${text('Suave')}</tg-card>
    </div>`,
  }),
};

/**
 * Escolha com rádio nativo (troque o modo na barra). Use Tab e as setas:
 * o teclado e o estado "selecionado" vêm do input.
 */
export const Escolha: Story = {
  render: () => ({
    props: { categoria: 'reparos' },
    template: `<div role="radiogroup" aria-label="Categoria" style="display:grid;grid-template-columns:repeat(3,minmax(0,220px));gap:16px">
      <label tgCard><input type="radio" name="categoria" value="limpeza" [(ngModel)]="categoria" />${text('Limpeza')}</label>
      <label tgCard><input type="radio" name="categoria" value="reparos" [(ngModel)]="categoria" />${text('Reparos')}</label>
      <label tgCard><input type="radio" name="categoria" value="beleza" disabled />${text('Beleza')}</label>
    </div>
    <div role="radiogroup" aria-label="Endereço" style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin-top:32px">
      <label tgCard indicator="control" style="display:flex;gap:12px;align-items:flex-start">
        <input type="radio" name="endereco" value="casa" checked />
        <span><strong style="display:block">Casa</strong><span style="color:var(--tg-text-secondary);font-size:14px">Rua Harmonia, 120 · Vila Madalena</span></span>
      </label>
      <label tgCard indicator="control" style="display:flex;gap:12px;align-items:flex-start">
        <input type="radio" name="endereco" value="trabalho" />
        <span><strong style="display:block">Trabalho</strong><span style="color:var(--tg-text-secondary);font-size:14px">Av. Paulista, 1000 · Bela Vista</span></span>
      </label>
    </div>`,
  }),
};

/** O card inteiro é um link (sem ações dentro). */
export const Link: Story = {
  render: () => ({
    template: `<ul style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,200px));gap:16px">
      <li><a tgCard dense href="#limpeza"><strong style="display:block">Limpeza</strong><span style="color:var(--tg-text-secondary);font-size:14px">128 profissionais</span></a></li>
      <li><a tgCard dense href="#reparos"><strong style="display:block">Reparos</strong><span style="color:var(--tg-text-secondary);font-size:14px">96 profissionais</span></a></li>
    </ul>`,
  }),
};

/**
 * Com ações dentro: o título é o link e se estica sobre o card. Clique em
 * qualquer ponto para abrir; o favoritar continua funcionando.
 */
export const LinkEsticado: Story = {
  name: 'Link esticado',
  render: () => ({
    props: { favorito: false },
    template: `<tg-card appearance="elevated" style="max-width:340px">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <span style="width:56px;height:56px;border-radius:999px;background:var(--tg-action-subtle);color:var(--tg-action-subtle-text);display:flex;align-items:center;justify-content:center;font-weight:800">MS</span>
        <div style="flex:1">
          <h3 style="margin:0;font-size:16px"><a tgCardLink href="#marina">Marina Souza</a></h3>
          <span style="color:var(--tg-text-secondary);font-size:14px">Limpeza · 2,3 km</span>
        </div>
        <button tgButton type="button" appearance="ghost" size="sm" [iconStart]="'star'" iconOnly
                aria-label="Favoritar Marina Souza" [attr.aria-pressed]="favorito" (click)="favorito = !favorito"></button>
      </div>
    </tg-card>`,
  }),
};
