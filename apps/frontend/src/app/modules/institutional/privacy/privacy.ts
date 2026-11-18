import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InstitutionalDocument } from '../institutional-document/institutional-document';
import type { InstitutionalSection } from '../institutional-pages';

/**
 * Texto do documento, seção por seção, como o jurídico aprovar (sem edição):
 * cada seção vira um h2 com âncora e entra no sumário. Vazio enquanto o
 * texto não for publicado; a página diz isso a quem abrir.
 */
export const PRIVACY_POLICY: readonly InstitutionalSection[] = [];

@Component({
  selector: 'app-privacy',
  imports: [InstitutionalDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-institutional-document heading="Privacidade" lead="Como o TaskGo coleta, usa e protege os seus dados pessoais." [sections]="sections" />`,
})
export class Privacy {
  protected readonly sections = PRIVACY_POLICY;
}
