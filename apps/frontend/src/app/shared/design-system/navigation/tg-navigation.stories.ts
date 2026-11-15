import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgAccountMenuComponent } from './tg-account-menu.component';
import { TgAppBarComponent } from './tg-app-bar.component';
import { TgNavItem } from './tg-nav-item';
import { TgNavComponent } from './tg-nav.component';

@Component({ template: '' })
class PageComponent {}

const CLIENTE: TgNavItem[] = [
  { label: 'Início', icon: 'house', link: '/customer', exact: true },
  { label: 'Buscar', icon: 'magnifying-glass', link: '/customer/search' },
  { label: 'Pedidos', icon: 'receipt', link: '/pedidos' },
  { label: 'Favoritos', icon: 'heart', link: '/customer/favorites' },
];
const PRESTADOR: TgNavItem[] = [
  { label: 'Agenda', icon: 'calendar-blank', link: '/provider', exact: true },
  { label: 'Pedidos', icon: 'receipt', link: '/pedidos' },
  { label: 'Serviços', icon: 'wrench', link: '/provider/services' },
  { label: 'Ganhos', icon: 'wallet', link: '/provider/recebimentos' },
];
const CONTA: TgNavItem = { label: 'Conta', icon: 'user-circle', link: '/conta' };
const LINKS: TgNavItem[] = [
  { label: 'Dados pessoais', icon: 'user', link: '/conta' },
  { label: 'Endereços', icon: 'map-pin', link: '/conta/enderecos' },
];

type Args = { items: TgNavItem[]; home: string; name: string; detail: string };

const meta: Meta<Args> = {
  title: 'Componentes/Navegação',
  decorators: [
    applicationConfig({ providers: [provideRouter([{ path: '**', component: PageComponent }])] }),
    moduleMetadata({ imports: [TgAppBarComponent, TgNavComponent, TgAccountMenuComponent, TgIconComponent] }),
  ],
  parameters: { layout: 'fullscreen' },
  render: (args) => ({
    props: { ...args, conta: CONTA, links: LINKS },
    template: `
      <tg-app-bar [homeLink]="home">
        <tg-nav [items]="items" [account]="conta" />
        <button type="button" aria-label="Notificações, 2 novas"
          style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border:0;border-radius:999px;background:transparent;color:var(--tg-text-primary);cursor:pointer">
          <tg-icon name="bell" [size]="22" />
          <span aria-hidden="true" style="position:absolute;top:9px;right:10px;width:8px;height:8px;border-radius:999px;background:var(--tg-feedback-danger-text)"></span>
        </button>
        <tg-account-menu [name]="name" [detail]="detail" [links]="links" />
      </tg-app-bar>
      <main id="conteudo" class="tg-nav-offset" style="min-height:100vh">
        <div style="padding:24px;color:var(--tg-text-secondary);font-family:var(--tg-font-sans)">
          <p>Conteúdo da página. Abaixo de 1024 px os destinos e a Conta descem para a barra de abas.</p>
          <button type="button">Primeiro item do conteúdo</button>
        </div>
      </main>`,
  }),
};
export default meta;

type Story = StoryObj<Args>;

/** Modo cliente. Mude a largura (ou o viewport) para ver a barra de abas. */
export const Cliente: Story = {
  args: { items: CLIENTE, home: '/customer', name: 'Ana Souza', detail: 'Cliente' },
};

/** Modo prestador (troque o modo na barra para o escuro). */
export const Prestador: Story = {
  args: { items: PRESTADOR, home: '/provider', name: 'Marina Souza', detail: 'Profissional' },
  globals: { theme: 'PROVIDER' },
};
