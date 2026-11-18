import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InstitutionalDocument } from '../institutional-document/institutional-document';
import type { InstitutionalSection } from '../institutional-pages';

/**
 * Texto do documento, seção por seção, como o jurídico aprovar (sem edição):
 * cada seção vira um h2 com âncora e entra no sumário. Vazio enquanto o
 * texto não for publicado; a página diz isso a quem abrir.
 */
export const SECURITY_POLICY: readonly InstitutionalSection[] = [];

@Component({
  selector: 'app-security',
  imports: [InstitutionalDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-institutional-document heading="Segurança" lead="Os cuidados com a sua conta, os pagamentos e os atendimentos no TaskGo." [sections]="sections" />`,
})
export class Security {
  protected readonly sections = SECURITY_POLICY;
}
