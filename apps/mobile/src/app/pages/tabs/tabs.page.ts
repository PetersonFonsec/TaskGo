import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import type { TgIconName } from '@taskgo/icons';

import { TgIconComponent } from '@app/shared/ui/tg-icon.component';

interface TabDestination {
  readonly tab: string;
  readonly label: string;
  readonly icon: TgIconName;
}

/**
 * Navegação principal do app (Design System, "Navegação"): `ion-tabs` com a
 * barra embaixo, os mesmos destinos e a mesma ordem do web. O app tem só
 * Início e Pedidos; Buscar, Favoritos e Conta entram quando essas telas
 * existirem no app (nada de aba que não leva a lugar nenhum).
 *
 * Telas internas (categoria, profissional, pedido e login) ficam fora das abas.
 */
export const TAB_DESTINATIONS: readonly TabDestination[] = [
  { tab: 'inicio', label: 'Início', icon: 'house' },
  { tab: 'pedidos', label: 'Pedidos', icon: 'receipt' }
];

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonLabel, TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom" aria-label="Principal">
        @for (item of destinations; track item.tab) {
          <ion-tab-button [tab]="item.tab">
            <span class="tab-icon">
              <tg-icon class="tab-icon__regular" [name]="item.icon" [size]="24" />
              <tg-icon class="tab-icon__fill" [name]="item.icon" weight="fill" [size]="24" />
            </span>
            <ion-label>{{ item.label }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: `
    ion-tab-bar {
      height: 64px;
    }

    // Atual: pílula action-subtle, ícone preenchido e texto em negrito.
    .tab-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 32px;
      margin-bottom: 2px;
      border-radius: var(--tg-radius-full);
    }

    .tab-icon__fill {
      display: none;
    }

    ion-tab-button.tab-selected {
      .tab-icon {
        background: var(--tg-action-subtle);
      }

      .tab-icon__regular {
        display: none;
      }

      .tab-icon__fill {
        display: inline-flex;
      }
    }
  `
})
export class TabsPage {
  protected readonly destinations = TAB_DESTINATIONS;
}
