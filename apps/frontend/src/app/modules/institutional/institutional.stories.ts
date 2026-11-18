import { provideLocationMocks } from '@angular/common/testing';
import { ChangeDetectionStrategy, Component, inject, provideAppInitializer, signal } from '@angular/core';
import { provideRouter, Router, type Routes } from '@angular/router';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { InstitutionalDocument } from './institutional-document/institutional-document';
import { InstitutionalPage } from './institutional-page';
import type { InstitutionalSection } from './institutional-pages';
import { InstitutionalRoutes } from './institutional.routes';

type Session = { user?: { id: string; type: string; name: string; photoUrl: string } };

const VISITOR: Session = {};
const PROVIDER: Session = { user: { id: '7', type: 'PRESTADOR', name: 'Bruno Lima', photoUrl: '' } };

/** A casca com a rota filha aberta em `url`, como visitante ou logado. */
function screen(url: string, session: Session = VISITOR, routes: Routes = InstitutionalRoutes) {
  return [
    provideLocationMocks(),
    provideRouter([{ path: 'institutional', children: routes }, { path: '**', redirectTo: url }]),
    provideAppInitializer(() => inject(Router).navigateByUrl(url)),
    { provide: UserLoggedService, useValue: { user: signal(session), logout: () => undefined } },
  ];
}

// Só para a story de leitura longa: texto de exemplo, não é conteúdo jurídico.
const SAMPLE = 'Texto de exemplo para mostrar a tipografia de leitura longa. O conteúdo real do documento entra aqui como o jurídico aprovar, sem edição, dividido em seções com título e parágrafos.';
const SAMPLE_SECTIONS: readonly InstitutionalSection[] = [
  { id: 'secao-1', title: '1. Primeira seção', blocks: [SAMPLE, SAMPLE] },
  { id: 'secao-2', title: '2. Segunda seção', blocks: [SAMPLE, { items: ['Primeiro item de exemplo', 'Segundo item de exemplo', 'Terceiro item de exemplo'] }] },
  { id: 'secao-3', title: '3. Terceira seção, com um título mais longo para quebrar linha', blocks: [SAMPLE] },
  { id: 'secao-4', title: '4. Quarta seção', blocks: [SAMPLE, SAMPLE] },
];

@Component({
  selector: 'app-institutional-sample',
  imports: [InstitutionalDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-institutional-document heading="Termos de uso" lead="As regras para usar o TaskGo, como cliente ou como profissional." [sections]="sections" />`,
})
class InstitutionalSample {
  protected readonly sections = SAMPLE_SECTIONS;
}

const meta: Meta<InstitutionalPage> = {
  title: 'Telas/Institucionais',
  component: InstitutionalPage,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<InstitutionalPage>;

export const TermosDeUso: Story = {
  name: 'Termos de uso',
  decorators: [applicationConfig({ providers: screen('/institutional/terms') })],
};

export const Privacidade: Story = {
  decorators: [applicationConfig({ providers: screen('/institutional/privacy') })],
};

export const Seguranca: Story = {
  name: 'Segurança',
  decorators: [applicationConfig({ providers: screen('/institutional/security') })],
};

export const CodigoDeConduta: Story = {
  name: 'Código de conduta',
  decorators: [applicationConfig({ providers: screen('/institutional/code-of-conduct') })],
};

/** Quem está logado vê "Voltar ao app" e o tema do seu modo (aqui, profissional). */
export const Logado: Story = {
  name: 'Logado (profissional)',
  globals: { theme: 'PROVIDER' },
  decorators: [applicationConfig({ providers: screen('/institutional/privacy', PROVIDER) })],
};

/** Como um documento com texto aparece: sumário "Nesta página", seções com âncora e listas. Texto de exemplo. */
export const LeituraLonga: Story = {
  name: 'Leitura longa (exemplo)',
  decorators: [
    applicationConfig({
      providers: screen('/institutional/terms', VISITOR, [{ path: 'terms', component: InstitutionalSample }]),
    }),
  ],
};
