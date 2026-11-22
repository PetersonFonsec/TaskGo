import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@environments/environment';

export interface InAppNotification {
  id: string;
  orderId: string | null;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export interface InAppNotificationList {
  items: InAppNotification[];
  total: number;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class Notification {
  readonly #http = inject(HttpClient);
  readonly #url = `${environment.url}/notifications`;

  list(take = 25) {
    const params = new HttpParams().set('skip', 0).set('take', take);
    return this.#http.get<InAppNotificationList>(this.#url, { params });
  }

  markAllRead() {
    return this.#http.patch<{ updatedCount: number; unreadCount: number }>(`${this.#url}/read-all`, {});
  }

  markRead(id: string) {
    return this.#http.patch<{ updated: boolean; notificationId: string }>(`${this.#url}/${encodeURIComponent(id)}/read`, {});
  }
}
