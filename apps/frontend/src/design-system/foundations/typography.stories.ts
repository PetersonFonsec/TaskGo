import type { Meta, StoryObj } from '@storybook/angular';
import { foundationStyles } from './foundation.styles';

const scale = [
  { token: 'display', weight: 800, tracking: 'display', sample: 'Olá, ', signature: 'Peterson' },
  { token: 'title-1', weight: 800, tracking: 'display', sample: 'Detalhes do pedido' },
  { token: 'title-2', weight: 800, tracking: 'title', sample: 'Próximos agendamentos' },
  { token: 'title-3', weight: 700, tracking: '', sample: 'Instalação elétrica residencial' },
  { token: 'body-lg', weight: 400, tracking: '', sample: 'Escolha uma categoria para ver quem atende perto de você.' },
  { token: 'body', weight: 400, tracking: '', sample: 'O profissional ainda vai confirmar o pedido.' },
  { token: 'body-sm', weight: 400, tracking: '', sample: '3,1 km · São Bernardo do Campo · Aceita Pix e cartão' },
  { token: 'label', weight: 700, tracking: '', sample: 'Solicitar por R$ 60,00' },
  { token: 'overline', weight: 700, tracking: 'overline', sample: 'Sua agenda' },
];

const meta: Meta = {
  title: 'Fundamentos/Tipografia',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/**
 * Manrope em tudo; Instrument Serif itálico só como assinatura (uma palavra,
 * em display ou title.1, no máximo uma vez por tela). Mínimo de 13 px.
 */
export const Escala: StoryObj = {
  render: () => ({
    props: { scale },
    styles: [
      foundationStyles,
      `.sig { font-family: var(--tg-font-signature); font-style: italic; font-weight: 400; color: var(--tg-action-primary); }
       .upper { text-transform: uppercase; color: var(--tg-action-primary); }
       .sample { font-variant-numeric: tabular-nums; }`,
    ],
    template: `<div class="page"><h2>Escala tipográfica</h2>
      <p>Tamanhos do web. No app, o mixin tg-type-scale-app reduz os títulos.</p>
      <div>
        @for (s of scale; track s.token) {
          <div class="row">
            <span class="name">{{ s.token }}</span>
            <span class="sample" [class.upper]="s.token === 'overline'"
              [style.fontSize]="'var(--tg-type-' + s.token + '-size)'"
              [style.lineHeight]="'var(--tg-type-' + s.token + '-line)'"
              [style.fontWeight]="s.weight"
              [style.letterSpacing]="s.tracking ? 'var(--tg-tracking-' + s.tracking + ')' : null">
              {{ s.sample }}@if (s.signature) {<em class="sig">{{ s.signature }}</em>}
            </span>
          </div>
        }
      </div></div>`,
  }),
};
