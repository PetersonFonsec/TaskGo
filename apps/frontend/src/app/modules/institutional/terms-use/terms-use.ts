import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InstitutionalDocument } from '../institutional-document/institutional-document';
import type { InstitutionalSection } from '../institutional-pages';

/**
 * Texto do documento, seção por seção, como o jurídico aprovar (sem edição):
 * cada seção vira um h2 com âncora e entra no sumário. Vazio enquanto o
 * texto não for publicado; a página diz isso a quem abrir.
 */
export const TERMS_OF_USE: readonly InstitutionalSection[] = [];

@Component({
  selector: 'app-terms-use',
  imports: [InstitutionalDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-institutional-document heading="Termos de uso" lead="As regras para usar o TaskGo, como cliente ou como profissional." [sections]="sections" />`,
})
export class TermsUse {
  protected readonly sections = TERMS_OF_USE;
}
