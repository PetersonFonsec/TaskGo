import { ChangeDetectionStrategy, Component } from '@angular/core';

import { InstitutionalDocument } from '../institutional-document/institutional-document';
import type { InstitutionalSection } from '../institutional-pages';

/**
 * Texto do documento, seção por seção, como o jurídico aprovar (sem edição):
 * cada seção vira um h2 com âncora e entra no sumário. Vazio enquanto o
 * texto não for publicado; a página diz isso a quem abrir.
 */
export const CODE_OF_CONDUCT: readonly InstitutionalSection[] = [];

@Component({
  selector: 'app-code-conduct',
  imports: [InstitutionalDocument],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-institutional-document heading="Código de conduta" lead="O que se espera de clientes e profissionais em cada atendimento." [sections]="sections" />`,
})
export class CodeConduct {
  protected readonly sections = CODE_OF_CONDUCT;
}
