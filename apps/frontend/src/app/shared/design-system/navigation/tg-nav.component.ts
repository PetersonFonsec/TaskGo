import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TgIconComponent } from '../icon/tg-icon.component';
import { TgNavItem } from './tg-nav-item';

/**
 * Destinos principais do TaskGo (Etapa 7). Uma lista só de links, que o CSS
 * mostra de dois jeitos:
 * - a partir de 1024 px, na barra do topo (dentro de `tg-app-bar`);
 * - abaixo de 1024 px, numa barra de abas fixa embaixo, com a Conta como
 *   última aba.
 *
 *   <tg-nav [items]="destinos" [account]="{ label: 'Conta', icon: 'user-circle', link: perfil }" />
 *
 * Abaixo de 1024 px o conteúdo da tela precisa da classe `tg-nav-offset`
 * (no `main`, por exemplo) para não ficar atrás da barra.
 */
@Component({
  selector: 'tg-nav',
  imports: [NgTemplateOutlet, RouterLink, RouterLinkActive, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A classe tg-nav-offset é usada fora do componente, no conteúdo da tela.
  encapsulation: ViewEncapsulation.None,
  host: { class: 'tg-nav-host' },
  template: `
    <nav class="tg-nav" [attr.aria-label]="label()">
      <ul class="tg-nav__list">
        @for (item of items(); track item.label) {
          <li class="tg-nav__entry">
            <ng-container *ngTemplateOutlet="link; context: { $implicit: item }" />
          </li>
        }
        @if (account(); as item) {
          <li class="tg-nav__entry tg-nav__entry--compact">
            <ng-container *ngTemplateOutlet="link; context: { $implicit: item }" />
          </li>
        }
      </ul>
    </nav>

    <ng-template #link let-item>
      <a
        class="tg-nav__link"
        [routerLink]="item.link"
        routerLinkActive="tg-nav__link--current"
        [routerLinkActiveOptions]="{ exact: !!item.exact }"
        ariaCurrentWhenActive="page"
        #active="routerLinkActive"
      >
        <span class="tg-nav__icon">
          <tg-icon [name]="item.icon" [weight]="active.isActive ? 'fill' : 'regular'" [size]="24" />
        </span>
        <span class="tg-nav__label">{{ item.label }}</span>
      </a>
    </ng-template>
  `,
  styleUrl: './tg-nav.component.scss',
})
export class TgNavComponent {
  /** Destinos principais, no máximo quatro (a Conta vem à parte). */
  readonly items = input.required<readonly TgNavItem[]>();
  /** Aba da Conta, só abaixo de 1024 px (acima, a conta fica no avatar). */
  readonly account = input<TgNavItem | undefined>(undefined);
  /** Nome do landmark. */
  readonly label = input('Principal');
}
