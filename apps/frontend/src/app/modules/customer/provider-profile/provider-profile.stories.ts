import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideLocationMocks } from '@angular/common/testing';
import { inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';
import { delay, NEVER, type Observable, of, throwError } from 'rxjs';

import { AuthenticatedShell } from '@shared/components/ui/authenticated-shell/authenticated-shell';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { ProviderProfile } from './provider-profile';

/** Mesmo formato de GET /provider/:id (publicProviderSelect + createdAt + as 20 avaliações mais recentes). */
const PROVIDER = {
  id: '12',
  bio: 'Eletricista há 12 anos, com NR-10. Faço instalações, reparos e revisão de quadros em casas e apartamentos.',
  ratingAvg: '4.8',
  ratingCount: 37,
  verified: true,
  createdAt: '2025-11-10T15:00:00.000Z',
  user: { id: '12', name: 'Bruno Lima', photoUrl: null },
  services: [
    { id: '3', title: 'Revisão do quadro de energia', description: 'Inspeção completa, troca de disjuntores e laudo simples.', basePrice: '250', status: 'ATIVO' },
    { id: '1', title: 'Instalação de chuveiro', description: 'Com teste de carga e troca da resistência, se precisar.', basePrice: '120', status: 'ATIVO' },
    { id: '2', title: 'Troca de tomada', description: null, basePrice: '89.9', status: 'ATIVO' },
  ],
  locations: [{ lat: -23.56, lng: -46.65 }],
  reviews: [
    { id: '7', rating: 5, comment: 'Chegou no horário, explicou o problema e deixou tudo limpo.', reviewedAt: '2026-11-12T13:00:00.000Z' },
    { id: '6', rating: 4, comment: null, reviewedAt: '2026-10-28T13:00:00.000Z' },
    { id: '5', rating: 5, comment: 'Resolveu a queda de energia em meia hora. Recomendo.', reviewedAt: '2026-10-02T13:00:00.000Z' },
  ],
};

const later = <T>(value: T) => of(value).pipe(delay(400));
const failing = (status: number) =>
  throwError(() => new HttpErrorResponse({ status, statusText: 'Erro' })).pipe(delay(400)) as Observable<never>;

/** A tela dentro do shell logado; a API responde depois de um instante, com dados de exemplo. */
function screen(response: Observable<unknown>, preview = false) {
  const path = preview ? 'provider/profile/12' : 'customer/profile/12';
  return [
    provideLocationMocks(),
    provideRouter([
      { path: 'provider/profile/:userId', component: ProviderProfile, data: { preview: true } },
      { path: 'customer/profile/:userId', component: ProviderProfile },
      { path: '**', redirectTo: path },
    ]),
    provideAppInitializer(() => inject(Router).navigateByUrl('/' + path)),
    {
      provide: UserLoggedService,
      useValue: {
        user: signal({
          user: preview
            ? { id: '12', type: 'PRESTADOR', name: 'Bruno Lima', photoUrl: '' }
            : { id: '7', type: 'CLIENTE', name: 'Marina Souza', photoUrl: '' },
        }),
        logout: () => undefined,
      },
    },
    { provide: HttpClient, useValue: { get: () => response } },
  ];
}

const meta: Meta<AuthenticatedShell> = {
  title: 'Telas/Perfil do profissional',
  component: AuthenticatedShell,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<AuthenticatedShell>;

/** Verificado, com nota, apresentação, três serviços e avaliações; "Agendar serviço" abre a tela de agendamento. */
export const PerfilCompleto: Story = {
  name: 'Perfil completo',
  decorators: [applicationConfig({ providers: screen(later(PROVIDER)) })],
};

/** Sem avaliações: "Novo no TaskGo" no lugar da nota e o estado vazio na seção. */
export const SemAvaliacoes: Story = {
  name: 'Sem avaliações',
  decorators: [
    applicationConfig({
      providers: screen(
        later({ ...PROVIDER, verified: false, bio: null, ratingAvg: '0', ratingCount: 0, reviews: [], user: { ...PROVIDER.user, name: 'João Pedro' } }),
      ),
    }),
  ],
};

/** A API hoje só devolve perfis com serviço ativo; se vier sem, a seção mostra o estado vazio. */
export const SemServicosAtivos: Story = {
  name: 'Sem serviços ativos',
  decorators: [applicationConfig({ providers: screen(later({ ...PROVIDER, services: [] })) })],
};

/** O prestador vê a prévia do próprio perfil (a partir de "Minha conta"), sem o botão de agendar. */
export const VistoPeloProprioPrestador: Story = {
  name: 'Visto pelo próprio prestador',
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen(later(PROVIDER), true) })],
};

/** Prévia de um prestador ainda não aprovado ou sem serviço ativo: a API devolve vazio. */
export const PreviaNaoPublica: Story = {
  name: 'Prévia ainda não pública',
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen(later(null), true) })],
};

/** A API devolve vazio (prestador inexistente, não aprovado ou sem serviço ativo) ou 404. */
export const NaoEncontrado: Story = {
  name: 'Não encontrado',
  decorators: [applicationConfig({ providers: screen(later(null)) })],
};

export const Carregando: Story = {
  decorators: [applicationConfig({ providers: screen(NEVER) })],
};

export const ComFalhaDaApi: Story = {
  name: 'Com falha da API',
  decorators: [applicationConfig({ providers: screen(failing(500)) })],
};
