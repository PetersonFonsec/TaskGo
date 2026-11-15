import type { Meta, StoryObj } from '@storybook/angular';
import { TG_ICONS } from '@taskgo/icons';
import { TgIconComponent } from './tg-icon.component';

const meta: Meta<TgIconComponent> = {
  title: 'Componentes/Ícone',
  component: TgIconComponent,
  args: { name: 'house', weight: 'regular', size: 24, label: '' },
  argTypes: {
    name: { control: 'select', options: Object.keys(TG_ICONS) },
    weight: { control: 'inline-radio', options: ['regular', 'fill'] },
    size: { control: 'inline-radio', options: [16, 20, 24] },
  },
};
export default meta;

export const Playground: StoryObj<TgIconComponent> = {};

/** Phosphor: contorno no estado normal, preenchido no item ativo da navegação. 20 px em texto, 24 px em navegação. */
export const Catalogo: StoryObj<TgIconComponent> = {
  name: 'Catálogo',
  render: () => ({
    props: { names: Object.keys(TG_ICONS) },
    template: `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;font:13px var(--tg-font-sans);color:var(--tg-text-primary)">
      @for (n of names; track n) {
        <div style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--tg-border-default);border-radius:var(--tg-radius-md);background:var(--tg-bg-surface)">
          <tg-icon [name]="n" [size]="24" /><tg-icon [name]="n" weight="fill" [size]="24" /><span>{{ n }}</span>
        </div>
      }
    </div>`,
  }),
};
