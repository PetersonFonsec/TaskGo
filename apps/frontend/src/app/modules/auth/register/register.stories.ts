import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, of, throwError } from 'rxjs';

import { Roles } from '@shared/enums/roles.enum';
import { CategoryService } from '@shared/service/category/category';
import { ICategory, ICategoryWithSubCategories, ISubCategory } from '@shared/service/category/category.model';
import { Geolocalization } from '@shared/service/geolocalization/geolocalization';
import { UserRegister } from '@shared/service/users/user-register';
import { UserStorage } from '@shared/service/users/user-storage';
import { AuthPage, ACCOUNT_THEME } from '../auth-page';
import { RegisterUser } from '../services/register-user/register-user';
import { Address } from './address/address';
import { Category } from './category/category';
import { Profile } from './profile/profile';
import { Register } from './register';
import { Services } from './services/services';
import { Social } from './social/social';

const NAMES = ['Elétrica', 'Hidráulica', 'Limpeza', 'Montagem', 'Pintura', 'Mudança'];
const base = { slug: '', description: '', icon: '', isActive: true, createdAt: {}, updatedAt: {} };
const CATEGORIES: ICategory[] = NAMES.map((name, i) => ({ ...base, id: i + 1, name, sortOrder: i, platformFeePct: null }));
const SERVICES: ISubCategory[] = ['Instalação de chuveiro', 'Troca de tomada', 'Reparo elétrico', 'Quadro de luz'].map(
  (name, i) => ({ ...base, id: 11 + i, categoryId: 1, name, sortOrder: i }),
);
const ELETRICA: ICategoryWithSubCategories = { ...CATEGORIES[0], subcategories: SERVICES };

interface ScreenOptions {
  type?: Roles;
  /** Rascunho com todos os passos feitos, pronto para "Criar sua conta". */
  complete?: boolean;
  /** CEP que não existe: a busca responde 404. */
  cepNotFound?: boolean;
  categoriesFail?: boolean;
}

/**
 * Casca da autenticação com os passos do cadastro. A navegação usa um
 * Location falso: a URL do iframe do Storybook não muda. As APIs respondem
 * depois de um instante, com dados de exemplo.
 */
function screen(url: string, opts: ScreenOptions = {}) {
  const step = { data: { [ACCOUNT_THEME]: true } };
  return [
    provideLocationMocks(),
    // A história já é a casca (AuthPage): as telas entram na saída dela.
    provideRouter([
      {
        path: 'authenticate',
        children: [
          { path: 'register', component: Register, ...step },
          { path: 'profile', component: Profile, ...step },
          { path: 'contact', component: Social, ...step },
          { path: 'address', component: Address, ...step },
          { path: 'category', component: Category, ...step },
          { path: 'category/:categoryId/service', component: Services, ...step },
        ],
      },
      { path: '**', redirectTo: 'authenticate/register' },
    ]),
    provideAppInitializer(() => {
      inject(UserStorage).type.set(opts.type ?? Roles.CUSTOMER);
      if (opts.complete) {
        const registerUser = inject(RegisterUser);
        registerUser.user.update((user) => ({ ...user, name: 'Ana Souza', services: [SERVICES[0]] }));
        registerUser.completeSteps.set({ profile: true, contact: true, address: true, category: true, service: true });
      }
      return inject(Router).navigateByUrl(url);
    }),
    {
      provide: CategoryService,
      useValue: {
        getCategories: () =>
          opts.categoriesFail
            ? throwError(() => new Error('offline')).pipe(delay(600))
            : of({ data: CATEGORIES }).pipe(delay(600)),
        getCategoryById: () => of(ELETRICA).pipe(delay(600)),
      },
    },
    {
      provide: Geolocalization,
      useValue: {
        getLatLngByCep: () =>
          opts.cepNotFound
            ? throwError(() => ({ status: 404 })).pipe(delay(500))
            : of({ street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP', latitude: -23.55, longitude: -46.63 }).pipe(
                delay(500),
              ),
        getCurrentPosition: () => of({ latitude: -23.55, longitude: -46.63 }).pipe(delay(800)),
      },
    },
    { provide: UserRegister, useValue: { registerUser: () => of({ user: {} }).pipe(delay(1200)) } },
  ];
}

const meta: Meta<AuthPage> = {
  title: 'Telas/Cadastro',
  component: AuthPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthPage>;

/** Toque em "Salvar e voltar" vazio para ver os erros e o foco no primeiro campo. */
export const Perfil: Story = {
  decorators: [applicationConfig({ providers: screen('/authenticate/profile') })],
};

/** Todos opcionais. Digite "@" no Instagram: não duplica. */
export const Contato: Story = {
  decorators: [applicationConfig({ providers: screen('/authenticate/contact') })],
};

/** Digite um CEP para preencher o endereço. */
export const Localizacao: Story = {
  name: 'Localização',
  decorators: [applicationConfig({ providers: screen('/authenticate/address') })],
};

/** Digite um CEP: o aviso pede "Usar minha localização" e cidade e UF viram campos. */
export const CepNaoEncontrado: Story = {
  name: 'Localização com CEP não encontrado',
  decorators: [applicationConfig({ providers: screen('/authenticate/address', { cepNotFound: true }) })],
};

export const Categoria: Story = {
  decorators: [applicationConfig({ providers: screen('/authenticate/category', { type: Roles.PROVIDER }) })],
};

export const CategoriaComFalha: Story = {
  name: 'Categoria com falha da API',
  decorators: [applicationConfig({ providers: screen('/authenticate/category', { type: Roles.PROVIDER, categoriesFail: true }) })],
};

export const Servicos: Story = {
  name: 'Serviços',
  decorators: [applicationConfig({ providers: screen('/authenticate/category/1/service', { type: Roles.PROVIDER }) })],
};

/** Toque em "Criar sua conta" para ver a conta criada do cliente. */
export const ContaCriadaCliente: Story = {
  name: 'Conta criada: cliente',
  decorators: [applicationConfig({ providers: screen('/authenticate/register', { complete: true }) })],
};

/** Toque em "Criar sua conta" para ver a conta criada do profissional. */
export const ContaCriadaProfissional: Story = {
  name: 'Conta criada: profissional',
  decorators: [applicationConfig({ providers: screen('/authenticate/register', { type: Roles.PROVIDER, complete: true }) })],
};
