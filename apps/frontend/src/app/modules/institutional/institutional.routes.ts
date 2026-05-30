import { Routes } from '@angular/router';
import { TermsUse } from './terms-use/terms-use';
import { CodeConduct } from './code-conduct/code-conduct';

export const InstitutionalRoutes: Routes = [
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
