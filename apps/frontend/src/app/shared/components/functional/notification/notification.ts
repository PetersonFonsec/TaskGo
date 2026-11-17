import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';

/**
 * Botão de notificações do topo. O nome inclui a contagem
 * ("Notificações, 2 novas"), como pede a navegação do Design System.
 */
@Component({
  selector: 'app-notification',
  imports: [TgIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notification.html',
  styleUrl: './notification.scss',
})
export class Notification {
  readonly notificationCount = input(0);

  protected readonly badge = computed(() => {
    const count = this.notificationCount();
    return count > 99 ? '99+' : String(count);
  });

  protected readonly label = computed(() => {
    const count = this.notificationCount();
    if (count <= 0) return 'Notificações';
    return `Notificações, ${count} ${count === 1 ? 'nova' : 'novas'}`;
  });
}
