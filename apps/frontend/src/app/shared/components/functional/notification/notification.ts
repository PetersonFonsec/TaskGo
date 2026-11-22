import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { InAppNotification, Notification as NotificationApi } from './notification.service';

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
export class Notification implements OnInit {
  readonly #api = inject(NotificationApi);
  readonly #router = inject(Router);
  readonly notificationCount = input(0);
  readonly apiUnreadCount = signal<number | null>(null);
  readonly count = computed(() => {
    const supplied = this.notificationCount();
    return supplied > 0 ? supplied : (this.apiUnreadCount() ?? 0);
  });
  readonly items = signal<InAppNotification[]>([]);
  readonly open = signal(false);
  readonly loading = signal(false);
  readonly error = signal(false);

  ngOnInit() {
    this.#api.list(1).subscribe({
      next: (result) => this.apiUnreadCount.set(result.unreadCount),
      error: () => undefined,
    });
  }

  protected readonly badge = computed(() => {
    const count = this.count();
    return count > 99 ? '99+' : String(count);
  });

  protected readonly label = computed(() => {
    const count = this.count();
    if (count <= 0) return 'Notificações';
    return `Notificações, ${count} ${count === 1 ? 'nova' : 'novas'}`;
  });

  toggle() {
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.open.set(true);
    this.load();
  }

  close() {
    this.open.set(false);
  }

  retry() {
    this.load();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) this.close();
  }

  openItem(item: InAppNotification) {
    const navigate = () => {
      this.open.set(false);
      if (item.orderId) void this.#router.navigateByUrl(`/orders/${item.orderId}`);
    };
    if (item.readAt) {
      navigate();
      return;
    }
    this.#api.markRead(item.id).subscribe({
      next: () => {
        this.apiUnreadCount.update((value) => Math.max(0, (value ?? 0) - 1));
        this.items.update((items) =>
          items.map((current) =>
            current.id === item.id ? { ...current, readAt: new Date().toISOString() } : current,
          ),
        );
        navigate();
      },
      error: () => {
        this.error.set(true);
        navigate();
      },
    });
  }

  formatDate(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  private load() {
    this.loading.set(true);
    this.error.set(false);
    this.#api.list().subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.apiUnreadCount.set(result.unreadCount);
        this.loading.set(false);
        if (result.unreadCount > 0) {
          this.#api.markAllRead().subscribe({
            next: () => {
              const readAt = new Date().toISOString();
              this.items.update((items) =>
                items.map((item) => (item.readAt ? item : { ...item, readAt })),
              );
              this.apiUnreadCount.set(0);
            },
            error: () => this.error.set(true),
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
