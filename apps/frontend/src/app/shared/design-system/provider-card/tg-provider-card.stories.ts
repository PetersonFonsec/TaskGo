import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { TgProviderCardComponent } from './tg-provider-card.component';
import type { TgProvider } from './tg-provider';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const ana: TgProvider = {
  id: '101',
  name: 'Ana Souza',
  verified: true,
  rating: 4.9,
  ratingCount: 128,
  distanceKm: 1.2,
  service: 'Limpeza residencial',
  priceFrom: 120,
};
const joao: TgProvider = {
  id: '102',
  name: 'João Pereira',
  rating: null,
  ratingCount: 0,
  distanceKm: 3.4,
  service: 'Instalação de chuveiro',
  priceFrom: 90,
};
const maria: TgProvider = {
  id: '103',
  name: 'Maria Clara de Albuquerque Nogueira',
  verified: true,
  rating: 4.7,
  ratingCount: 52,
  service: 'Montagem de móveis planejados e reparos em geral',
  priceFrom: 1250,
};
const rafael: TgProvider = {
  id: '104',
  name: 'Rafael Santos',
  verified: true,
  rating: 5,
  ratingCount: 9,
  distanceKm: 0.8,
  service: 'Pintura',
};

const meta: Meta<TgProviderCardComponent> = {
  title: 'Domínio/Card de prestador',
  component: TgProviderCardComponent,
  decorators: [applicationConfig({ providers: [provideRouter([{ path: '**', component: PageComponent }])] })],
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TgProviderCardComponent>;

/** Lista de resultados da busca. O nome é o link; o coração fica por cima. */
export const Lista: Story = {
  render: () => ({
    props: {
      providers: [ana, joao, maria, rafael],
      favorites: { '101': true } as Record<string, boolean>,
      // O estado fica com a tela: o card só pede a troca.
      toggle(this: { favorites: Record<string, boolean> }, id: string, value: boolean) {
        this.favorites = { ...this.favorites, [id]: value };
      },
    },
    template: `
      <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px;max-width:720px">
        @for (p of providers; track p.id) {
          <li>
            <tg-provider-card
              [provider]="p"
              [link]="['/customer', p.id]"
              [favorite]="!!favorites[p.id]"
              (favoriteChange)="toggle(p.id, $event)" />
          </li>
        }
      </ul>`,
  }),
};

/** Sem a flag de favoritos: o coração não aparece. */
export const SemFavorito: Story = {
  name: 'Sem favorito',
  render: () => ({
    props: { p: ana },
    template: `<div style="max-width:720px"><tg-provider-card [provider]="p" [link]="['/customer', p.id]" /></div>`,
  }),
};

/** Dados que faltam somem: sem avaliações vira "Novo no TaskGo"; sem preço, "Preço sob consulta". */
export const DadosParciais: Story = {
  name: 'Dados parciais',
  render: () => ({
    props: { a: joao, b: rafael, c: { id: '105', name: 'Carlos' } satisfies TgProvider },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;max-width:720px">
        <tg-provider-card [provider]="a" [link]="['/customer', a.id]" [favorite]="false" />
        <tg-provider-card [provider]="b" [link]="['/customer', b.id]" [favorite]="false" />
        <tg-provider-card [provider]="c" [link]="['/customer', c.id]" />
      </div>`,
  }),
};

/** O layout segue o container: em 320 px a foto diminui e o preço desce, mesmo numa tela larga. */
export const ContainerEstreito: Story = {
  name: 'Container estreito',
  render: () => ({
    props: { a: ana, b: maria },
    template: `
      <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
        <div style="width:320px;display:flex;flex-direction:column;gap:12px">
          <tg-provider-card [provider]="a" [link]="['/customer', a.id]" [favorite]="true" />
          <tg-provider-card [provider]="b" [link]="['/customer', b.id]" [favorite]="false" />
        </div>
        <div style="width:560px">
          <tg-provider-card [provider]="a" [link]="['/customer', a.id]" [favorite]="false" />
        </div>
      </div>`,
  }),
};
