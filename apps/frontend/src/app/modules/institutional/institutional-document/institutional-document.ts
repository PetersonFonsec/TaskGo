import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { type InstitutionalBlock, type InstitutionalSection, TOC_MIN_SECTIONS } from '../institutional-pages';

/**
 * Corpo de leitura de um documento institucional: título, linha de apoio,
 * sumário com âncoras (a partir de três seções) e as seções. Sem seções, diz
 * que o texto ainda não foi publicado. O texto vem da página, sem edição.
 */
@Component({
  selector: 'app-institutional-document',
  imports: [TgCardComponent, TgEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './institutional-document.html',
  styleUrl: './institutional-document.scss',
})
export class InstitutionalDocument {
  readonly heading = input.required<string>();
  readonly lead = input('');
  readonly sections = input<readonly InstitutionalSection[]>([]);

  readonly #document = inject(DOCUMENT);
  readonly #router = inject(Router);

  protected readonly showToc = computed(() => this.sections().length >= TOC_MIN_SECTIONS);
  protected readonly tocId = computed(() => `${this.slug()}-sumario`);
  protected readonly slug = computed(() =>
    this.heading()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
  );

  protected isList(block: InstitutionalBlock): block is { readonly items: readonly string[] } {
    return typeof block !== 'string';
  }

  protected href(id: string): string {
    return `${this.#router.url.split('#')[0]}#${id}`;
  }

  // O app não liga o anchorScrolling do router: o clique rola até a seção e
  // move o foco para o título dela, sem trocar a rota.
  protected goTo(event: Event, id: string): void {
    const target = this.#document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  }
}
