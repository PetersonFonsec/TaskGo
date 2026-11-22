import { Routes } from '@angular/router';
import { TermsUse } from './terms-use/terms-use';
import { CodeConduct } from './code-conduct/code-conduct';
import { Privacy } from './privacy/privacy';
import { Security } from './security/security';

export const InstitutionalRoutes: Routes = [
  { path: '', redirectTo: 'terms', pathMatch: 'full' },
  { path: 'terms', component: TermsUse, title: 'Termos de uso - TaskGo' },
  { path: 'privacy', component: Privacy, title: 'Privacidade - TaskGo' },
  { path: 'security', component: Security, title: 'Segurança - TaskGo' },
  { path: 'code-of-conduct', component: CodeConduct, title: 'Código de conduta - TaskGo' },
  // Links do rodapé e da página 404; seguem como estavam.
  {
    path: 'about',
    component: TermsUse,
    title: `Quem somos - TaskGo`,
    data: { animation: 'Quem somos' },
  },
  {
    path: `faq`,
    component: CodeConduct,
    title: `Perguntas Frequentes - TaskGo`,
    data: { animation: 'LoginPage' }
  },
  {
    path: 'support',
    component: CodeConduct,
    title: `Ajuda - TaskGo`,
    data: { animation: 'Ajuda' },
  },
];
