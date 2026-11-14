import type { Meta, StoryObj } from '@storybook/angular';
import { foundationStyles } from './foundation.styles';

const meta: Meta = {
  title: 'Fundamentos/Espaço e forma',
  id: 'fundamentos-espaco-forma',
  parameters: { layout: 'fullscreen' },
};
export default meta;

const space = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16];

/** Base de 4 px. */
export const Espaco: StoryObj = {
  name: 'Espaço',
  render: () => ({
    props: { space },
    styles: [foundationStyles, `.bar { height: 16px; background: var(--tg-action-primary); border-radius: 4px; }`],
    template: `<div class="page"><h2>Espaço</h2><div>
      @for (s of space; track s) {
        <div class="row"><span class="name">--tg-space-{{ s }}</span>
          <span class="bar" [style.width]="'var(--tg-space-' + s + ')'"></span>
          <span class="note">{{ s * 4 }} px</span></div>
      }</div></div>`,
  }),
};

const radius = ['sm', 'md', 'lg', 'xl', '2xl', 'full'];

export const Raios: StoryObj = {
  render: () => ({
    props: { radius },
    styles: [
      foundationStyles,
      `.box { width: 96px; height: 64px; background: var(--tg-action-subtle); border: 1px solid var(--tg-border-default); }`,
    ],
    template: `<div class="page"><h2>Raios</h2>
      <p>sm em chips internos, md em campos, lg em cartões, xl em painéis, 2xl em folhas, full em botões e pílulas.</p>
      <div class="grid">
        @for (r of radius; track r) {
          <div class="meta"><div class="box" [style.borderRadius]="'var(--tg-radius-' + r + ')'"></div>
            <span class="name">--tg-radius-{{ r }}</span></div>
        }
      </div></div>`,
  }),
};

const elevations = [
  { level: 0, use: 'Plano, com borda' },
  { level: 1, use: 'Cartões' },
  { level: 2, use: 'Menus e popovers' },
  { level: 3, use: 'Modais, com scrim' },
];

/** No modo prestador, a profundidade vem do tom da superfície. */
export const Elevacao: StoryObj = {
  name: 'Elevação',
  render: () => ({
    props: { elevations },
    styles: [
      foundationStyles,
      `.card { height: 96px; border-radius: var(--tg-radius-lg); background: var(--tg-bg-surface); border: 1px solid var(--tg-border-default); padding: var(--tg-space-4); }`,
    ],
    template: `<div class="page"><h2>Elevação</h2>
      <div class="grid" style="gap: var(--tg-space-8)">
        @for (e of elevations; track e.level) {
          <div class="card" [style.boxShadow]="'var(--tg-elevation-' + e.level + ')'">
            <span class="name">--tg-elevation-{{ e.level }}</span><br><span class="note">{{ e.use }}</span></div>
        }
      </div></div>`,
  }),
};

const controls = ['sm', 'md', 'lg'];

/** Alturas de controle. 44 px é o padrão e o alvo mínimo de toque. */
export const Controles: StoryObj = {
  render: () => ({
    props: { controls },
    styles: [
      foundationStyles,
      `.ctl { display: inline-flex; align-items: center; padding: 0 var(--tg-space-5); border-radius: var(--tg-radius-full);
        background: var(--tg-action-primary); color: var(--tg-text-on-action); font: 700 var(--tg-type-label-size)/var(--tg-type-label-line) var(--tg-font-sans); }`,
    ],
    template: `<div class="page"><h2>Alturas de controle</h2>
      <div style="display:flex; gap: var(--tg-space-4); align-items: center">
        @for (c of controls; track c) {
          <span class="ctl" [style.height]="'var(--tg-control-' + c + ')'">control-{{ c }}</span>
        }
      </div></div>`,
  }),
};
