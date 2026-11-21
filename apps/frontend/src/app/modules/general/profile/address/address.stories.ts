import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { Address as AddressService } from '@shared/service/address/address';
import type { IFullAddress, ResponseAddressList } from '@shared/service/address/address.model';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { User } from '@shared/service/users/user';
import { Profile } from '../profile';
import { Address } from './address';

const address = (id: string, extra: Partial<IFullAddress>) =>
  ({
    id,
    label: 'Casa',
    street: 'Rua das Flores',
    number: '120',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    country: 'BR',
    cep: '05415000',
    lat: -23.56,
    lng: -46.68,
    isDefault: false,
    active: true,
    ...extra,
  }) as IFullAddress;

const ADDRESSES: IFullAddress[] = [
  address('1', { isDefault: true, complement: 'Apto 42, bloco B', neighborhood: 'Pinheiros' }),
  address('2', { label: 'Trabalho', street: 'Avenida Paulista', number: '1000', complement: '12º andar', cep: '01310100' }),
  address('3', { label: 'Casa da mãe', street: 'Rua Domingos de Morais', number: '2187', city: 'São Paulo', cep: '04035000' }),
];

const page = (data: IFullAddress[]): ResponseAddressList => ({
  data,
  meta: { total: data.length, page: 1, limit: 100, totalPages: 1, hasPrevPage: false, hasNextPage: false },
});
const later = <T>(value: T) => of(value).pipe(delay(400));
const failing = <T>() => throwError((): unknown => new Error('offline')).pipe(delay(400)) as Observable<T>;

interface Api {
  list: Observable<ResponseAddressList>;
  save?: Observable<unknown>;
  cep?: Observable<{ street?: string; neighborhood?: string; city: string; state: string }>;
}

/** A tela dentro do shell logado e do perfil da conta; as APIs respondem depois de um instante. */
function screen({ list, save = later({}), cep = later({ street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' }) }: Api) {
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'general/:userId', component: Profile, children: [{ path: 'addresses', component: Address }] },
      { path: '**', redirectTo: 'general/42/addresses' },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/general/42/addresses')),
    {
      provide: UserLoggedService,
      useValue: { user: signal({ user: { id: '42', type: 'CLIENTE', name: 'Ana Souza', photoUrl: '' } }), logout: () => undefined },
    },
    { provide: User, useValue: { getUser: () => of({ id: '42', name: 'Ana Souza', photoUrl: '', bio: '' }) } },
    {
      provide: AddressService,
      useValue: { getAddress: () => list, createAddress: () => save, updateAddress: () => save, removeAddress: () => save },
    },
    { provide: Geolocalization, useValue: { getAddressByCep: () => cep } },
  ];
}

/** Espera um elemento da tela aparecer (a lista chega depois de 400 ms). */
async function find<T extends Element>(root: ParentNode, selector: string, text?: string): Promise<T> {
  for (let i = 0; i < 60; i++) {
    const found = Array.from(root.querySelectorAll<T>(selector)).find((el) => !text || el.textContent?.trim() === text);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Não apareceu: ${selector} ${text ?? ''}`);
}

async function type(doc: Document, name: string, value: string) {
  const input = await find<HTMLInputElement>(doc, `tg-sheet [name="${name}"]`);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Endereços',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
  globals: { theme: 'CUSTOMER' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** "Editar" e "Adicionar endereço" abrem o painel; "Remover" pede confirmação. */
export const ComEnderecos: Story = {
  name: 'Com endereços',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)) }) })],
};

export const SemEnderecos: Story = {
  name: 'Sem endereços',
  decorators: [applicationConfig({ providers: screen({ list: later(page([])) }) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen({ list: NEVER }) })],
};

export const ComFalhaDaApi: Story = {
  name: 'Com falha da API',
  decorators: [applicationConfig({ providers: screen({ list: failing() }) })],
};

/** O painel de novo endereço depois de tentar salvar vazio: erro abaixo de cada campo. */
export const NovoComErros: Story = {
  name: 'Novo endereço com erros',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)) }) })],
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    (await find<HTMLButtonElement>(doc, 'button', 'Adicionar endereço')).click();
    await find(doc, 'tg-sheet form');
    (await find<HTMLButtonElement>(doc, 'tg-sheet button[type="submit"]')).click();
  },
};

/** O CEP preenche rua, cidade e estado; número e complemento ficam com a pessoa. */
export const BuscaDoCep: Story = {
  name: 'Busca do CEP',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)), cep: NEVER }) })],
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    (await find<HTMLButtonElement>(doc, 'button', 'Adicionar endereço')).click();
    await type(doc, 'label', 'Trabalho');
    await type(doc, 'cep', '01310100');
  },
};

export const CepNaoEncontrado: Story = {
  name: 'CEP não encontrado',
  decorators: [
    applicationConfig({
      providers: screen({ list: later(page(ADDRESSES)), cep: throwError(() => ({ status: 404 })).pipe(delay(300)) }),
    }),
  ],
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    (await find<HTMLButtonElement>(doc, 'button', 'Adicionar endereço')).click();
    await type(doc, 'cep', '99999999');
  },
};

export const EditarEndereco: Story = {
  name: 'Editar endereço',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)) }) })],
  play: async ({ canvasElement }) => {
    (await find<HTMLButtonElement>(canvasElement.ownerDocument, '.address button', 'Editar')).click();
  },
};

export const FalhaAoSalvar: Story = {
  name: 'Falha ao salvar',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)), save: failing() }) })],
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    (await find<HTMLButtonElement>(doc, '.address button', 'Editar')).click();
    await find(doc, 'tg-sheet form');
    (await find<HTMLButtonElement>(doc, 'tg-sheet button[type="submit"]')).click();
  },
};

export const RemoverEndereco: Story = {
  name: 'Remover endereço',
  decorators: [applicationConfig({ providers: screen({ list: later(page(ADDRESSES)) }) })],
  play: async ({ canvasElement }) => {
    (await find<HTMLButtonElement>(canvasElement.ownerDocument, '.address button', 'Remover')).click();
  },
};
