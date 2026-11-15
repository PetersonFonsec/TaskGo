import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Barra do topo do TaskGo (Etapa 7): link "Pular para o conteúdo", marca,
 * destinos (`tg-nav`) e, no fim, o que a tela puser (notificações e
 * `tg-account-menu`).
 *
 *   <tg-app-bar homeLink="/customer">
 *     <tg-nav [items]="destinos" [account]="conta" />
 *     <app-notification />
 *     <tg-account-menu name="Ana Souza" detail="Cliente" [links]="links" (signOut)="sair()" />
 *   </tg-app-bar>
 *   <main id="conteudo" class="tg-nav-offset">…</main>
 *
 * 72 px a partir de 1024 px; 56 px abaixo, quando os destinos descem para
 * a barra de abas.
 */
@Component({
  selector: 'tg-app-bar',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="tg-app-bar__skip" [href]="'#' + mainId()" (click)="skipToContent($event)">Pular para o conteúdo</a>
    <header class="tg-app-bar">
      <a class="tg-app-bar__brand" [routerLink]="homeLink()">
        <span class="tg-app-bar__mark" aria-hidden="true">T</span>
        <span>TaskGo</span>
      </a>
      <ng-content select="tg-nav" />
      <div class="tg-app-bar__end">
        <ng-content />
      </div>
    </header>
  `,
  styleUrl: './tg-app-bar.component.scss',
})
export class TgAppBarComponent {
  /** Destino da marca: a home do modo. */
  readonly homeLink = input<string | readonly unknown[]>('/');
  /** Id do `main` que o "Pular para o conteúdo" foca. */
  readonly mainId = input('conteudo');

  readonly #document = inject(DOCUMENT);

  // O href fica para quem abre em nova aba; o clique foca o main sem
  // passar pelo router (que trocaria a rota pelo fragmento).
  protected skipToContent(event: Event) {
    const main = this.#document.getElementById(this.mainId());
    if (!main) return;
    event.preventDefault();
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus();
  }
}
