import { Component } from '@angular/core';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { NEVER, type Observable, of, throwError } from 'rxjs';
import { Address } from '@shared/service/address/address';
import { CategoryService } from '@shared/service/category/category';
import type { ICategory } from '@shared/service/category/category.model';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Search } from './search';

// Qualquer rota resolve: o Storybook roda em iframe.html e o link não sai da história.
@Component({ template: '' })
class PageComponent {}

const CATEGORIES = ['Elétrica', 'Hidráulica', 'Limpeza', 'Montagem', 'Pintura', 'Mudança'].map(
  (name, id) => ({ id, name, slug: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') }) as unknown as ICategory,
);

// Mesmo formato da API (publicProviderSelect): id do Provider, usuário e serviços ativos.
const provider = (id: string, name: string, rating: number | null, count: number, lat: number, lng: number, service: string, price: number, verified = true) => ({
  id,
  user: { name, photoUrl: null, provider: { ratingAvg: rating, ratingCount: count, verified } },
  services: [{ id: `s${id}`, title: service, category: 'eletrica', basePrice: price }],
  locations: [{ lat, lng }],
});

const HOME = { lat: -23.561, lng: -46.656 };
const PROVIDERS = [
  provider('3', 'João Pedro', null, 0, -23.594, -46.69, 'Reparo elétrico', 95, false),
  provider('1', 'Bruno Lima', 4.9, 128, -23.566, -46.651, 'Instalação de chuveiro', 120),
  provider('2', 'Marta Silva', 4.7, 54, -23.58, -46.66, 'Troca de tomada', 80),
];

function providers(search: Observable<unknown>, opts: { location?: boolean; query?: Record<string, string> } = {}) {
  const location = opts.location ?? true;
  return [
    provideRouter([{ path: '**', component: PageComponent }]),
    { provide: ActivatedRoute, useValue: { queryParams: of(opts.query ?? { categoria: 'eletrica' }) } },
    { provide: UserLoggedService, useValue: { user: () => ({ user: { id: '7', name: 'Marina Souza' } }) } },
    {
      provide: Address,
      useValue: {
        getAllAddresses: () =>
          of(location ? [{ id: 'a1', label: 'Casa', street: 'Rua das Flores', number: '120', city: 'São Paulo', state: 'SP', isDefault: true, ...HOME }] : []),
      },
    },
    { provide: Geolocalization, useValue: { getCurrentPosition: () => throwError(() => new Error('negado')) } },
    { provide: CategoryService, useValue: { getCategories: () => of({ data: CATEGORIES }) } },
    {
      provide: Provider,
      useValue: {
        findProvidersByCategorySlug: () => search,
        listFavorites: () => of({ items: [{ providerId: '1' }] }),
        addFavorite: () => of(null),
        removeFavorite: () => of(null),
      },
    },
  ];
}

const meta: Meta<Search> = {
  title: 'Telas/Busca de profissionais',
  component: Search,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<Search>;

/** Elétrica, perto do endereço principal: mais próximos primeiro, com um favorito. */
export const ComResultados: Story = {
  name: 'Com resultados',
  decorators: [applicationConfig({ providers: providers(of(PROVIDERS)) })],
};

export const FiltrosAtivos: Story = {
  name: 'Com filtros ativos',
  decorators: [
    applicationConfig({ providers: providers(of(PROVIDERS), { query: { categoria: 'eletrica', minimumRating: '4', maximumDistance: '10' } }) }),
  ],
};

export const SemResultados: Story = {
  name: 'Sem resultados',
  decorators: [applicationConfig({ providers: providers(of([])) })],
};

export const SemLocalizacao: Story = {
  name: 'Sem localização',
  decorators: [applicationConfig({ providers: providers(of(PROVIDERS), { location: false }) })],
};

export const Carregando: Story = {
  name: 'Carregando',
  decorators: [applicationConfig({ providers: providers(NEVER) })],
};

export const Erro: Story = {
  name: 'Falha na busca',
  decorators: [applicationConfig({ providers: providers(throwError(() => new Error('offline'))) })],
};
