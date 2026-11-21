import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';
import type { PublicUserProfile, UserProfileUpdateRequest } from '@taskgo/shared';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ProfileEdit } from './edit/profile-edit';
import { PROFILE_SAVED_STATE } from './personal-data';
import { ProfileView } from './view/profile-view';

const CUSTOMER: PublicUserProfile = {
  id: '42',
  name: 'Ana Souza',
  email: 'ana.souza@email.com',
  phone: '11912345678',
  cpf: '12345678909',
  type: 'CLIENTE',
  photoUrl: null,
  emailVerified: true,
  phoneVerified: false,
  addresses: [
    {
      id: '1',
      label: 'Casa',
      street: 'Rua Harmonia',
      number: '120',
      complement: 'Apto 42',
      city: 'São Paulo',
      state: 'SP',
      isDefault: true,
    },
  ],
};

const PROVIDER: PublicUserProfile = {
  ...CUSTOMER,
  id: '7',
  name: 'Bruno Lima',
  email: 'bruno.lima@email.com',
  phone: '21934567890',
  type: 'PRESTADOR',
  emailVerified: true,
  phoneVerified: true,
  addresses: [],
};

const later = <T>(value: T, ms = 400) => of(value).pipe(delay(ms));
const failing = <T>(status: number) =>
  throwError(() => new HttpErrorResponse({ status, statusText: 'Erro' })).pipe(delay(400)) as Observable<T>;

interface ScreenOptions {
  page?: 'view' | 'edit';
  /** Resposta do PATCH. Por padrão, salva e devolve o perfil com as mudanças. */
  save?: (body: UserProfileUpdateRequest) => Observable<PublicUserProfile>;
  /** Chega na tela de dados vindo de um salvamento. */
  saved?: boolean;
}

/** A tela dentro do shell logado; a API responde depois de um instante, com dados de exemplo. */
function screen(profile: PublicUserProfile, load: Observable<PublicUserProfile>, opts: ScreenOptions = {}) {
  const base = `general/${profile.id}/profile`;
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'general/:userId/profile/view', component: ProfileView },
      { path: 'general/:userId/profile/edit', component: ProfileEdit },
      { path: '**', redirectTo: `${base}/view` },
    ]),
    provideAppInitializer(() =>
      inject(Router).navigateByUrl(`/${base}/${opts.page ?? 'view'}`, opts.saved ? { state: { [PROFILE_SAVED_STATE]: true } } : {}),
    ),
    {
      provide: UserLoggedService,
      useValue: {
        user: signal({ user: { id: profile.id, type: profile.type, name: profile.name, photoUrl: profile.photoUrl ?? '' } }),
        setUserLogged: () => undefined,
        logout: () => undefined,
      },
    },
    {
      provide: HttpClient,
      useValue: {
        get: () => load,
        patch: (_url: string, body: UserProfileUpdateRequest) =>
          opts.save ? opts.save(body) : later({ ...profile, ...body } as PublicUserProfile, 600),
      },
    },
  ];
}

/** Espera o formulário carregar, preenche os campos e toca "Salvar dados". */
async function fillAndSave(canvas: HTMLElement, values: Partial<Record<'photo-url' | 'name' | 'email' | 'phone', string>>) {
  const root = canvas.ownerDocument;
  for (let i = 0; i < 50 && !root.querySelector('#name-input'); i++) await new Promise((resolve) => setTimeout(resolve, 100));
  for (const [field, value] of Object.entries(values)) {
    const input = root.querySelector<HTMLInputElement>(`#${field}-input`);
    if (!input) continue;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  root.querySelector<HTMLButtonElement>('[data-cy="save-profile"]')?.click();
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Dados pessoais',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** Cliente: atalho para favoritos, endereço principal e a verificação de cada contato. */
export const Cliente: Story = {
  decorators: [applicationConfig({ providers: screen(CUSTOMER, later(CUSTOMER)) })],
};

/** Prestador: atalhos de Ganhos e Meus serviços, e o link do perfil público. Sem endereço. */
export const Prestador: Story = {
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen(PROVIDER, later(PROVIDER)) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen(CUSTOMER, NEVER) })],
};

export const ErroAoCarregar: Story = {
  name: 'Erro ao carregar',
  decorators: [applicationConfig({ providers: screen(CUSTOMER, failing(500)) })],
};

/** Formulário com os dados atuais. Só o que mudar vai para a API. */
export const Edicao: Story = {
  name: 'Edição',
  decorators: [applicationConfig({ providers: screen(CUSTOMER, later(CUSTOMER), { page: 'edit' }) })],
};

/** Ao salvar, cada campo mostra o que falta e o foco vai ao primeiro inválido. */
export const EdicaoComErros: Story = {
  name: 'Edição com erros',
  decorators: [applicationConfig({ providers: screen(CUSTOMER, later(CUSTOMER), { page: 'edit' }) })],
  play: ({ canvasElement }) => fillAndSave(canvasElement, { 'photo-url': 'http://foto', name: ' ', email: 'ana@email', phone: '1234-5678' }),
};

export const Salvando: Story = {
  decorators: [applicationConfig({ providers: screen(CUSTOMER, later(CUSTOMER), { page: 'edit', save: () => NEVER }) })],
  play: ({ canvasElement }) => fillAndSave(canvasElement, { name: 'Ana Clara Souza' }),
};

export const ErroAoSalvar: Story = {
  name: 'Erro ao salvar',
  decorators: [
    applicationConfig({ providers: screen(CUSTOMER, later(CUSTOMER), { page: 'edit', save: () => failing(500) }) }),
  ],
  play: ({ canvasElement }) => fillAndSave(canvasElement, { email: 'ana.clara@email.com' }),
};

/** De volta aos dados depois de salvar. */
export const Sucesso: Story = {
  decorators: [
    applicationConfig({
      providers: screen({ ...CUSTOMER, name: 'Ana Clara Souza' }, later({ ...CUSTOMER, name: 'Ana Clara Souza' }), { saved: true }),
    }),
  ],
};
