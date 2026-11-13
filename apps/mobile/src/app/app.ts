import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

import { AuthService } from './core/auth/auth.service';
import { PushRegistrationService } from './core/push/push-registration.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `<ion-app><ion-router-outlet /></ion-app>`
})
export class App implements OnInit {
  readonly #auth = inject(AuthService);
  readonly #push = inject(PushRegistrationService);

  async ngOnInit(): Promise<void> {
    await this.#auth.restore();
    if (this.#auth.isAuthenticated()) {
      // O token do aparelho pode mudar entre aberturas; o registro na API é idempotente.
      await this.#push.sync().catch(() => undefined);
    }
  }
}
