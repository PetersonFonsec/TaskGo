import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './core/auth/auth.service';
import { AppEvents } from './core/platform/app-events';
import { PushRegistrationService } from './core/push/push-registration.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`
})
export class App implements OnInit {
  readonly #auth = inject(AuthService);
  readonly #push = inject(PushRegistrationService);
  readonly #events = inject(AppEvents);

  async ngOnInit(): Promise<void> {
    // Rede de volta ou app de volta à frente: reenvia o que ficou pendente.
    this.#events.onReconnect(() => {
      void this.#auth.flushPendingRevocations();
      void this.#push.retry();
    });
    await this.#auth.restore();
    void this.#auth.flushPendingRevocations();
    if (this.#auth.isAuthenticated()) {
      // O token do aparelho pode mudar entre aberturas; o registro na API é idempotente.
      await this.#push.sync().catch(() => undefined);
    }
  }
}
