import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '@app/core/auth/auth.service';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { NativePush } from './native-push';

export type PushSetupResult = 'registering' | 'denied' | 'unsupported';

/**
 * Liga o aparelho à sessão do cliente: pede permissão, obtém o token FCM/APNs e
 * envia para `POST /devices`. A API amarra o aparelho à sessão do access token,
 * então o registro precisa acontecer depois do login (e de novo a cada login).
 */
@Injectable({ providedIn: 'root' })
export class PushRegistrationService {
  readonly #push = inject(NativePush);
  readonly #http = inject(HttpClient);
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;
  #listening: Promise<void> | null = null;

  /** Pede a permissão se ainda não foi decidida. Usar logo após o login. */
  enable(): Promise<PushSetupResult> {
    return this.#setup(true);
  }

  /** Reenvia o token só se a permissão já foi dada (abertura do app). */
  sync(): Promise<PushSetupResult> {
    return this.#setup(false);
  }

  async #setup(askIfUndecided: boolean): Promise<PushSetupResult> {
    const platform = this.#push.platform();
    if (!platform) return 'unsupported';

    let permission = (await this.#push.checkPermissions()).receive;
    if (askIfUndecided && permission.startsWith('prompt')) {
      permission = (await this.#push.requestPermissions()).receive;
    }
    if (permission !== 'granted') return 'denied';

    this.#listening ??= this.#listen(platform);
    await this.#listening;
    await this.#push.register();
    return 'registering';
  }

  async #listen(platform: 'ANDROID' | 'IOS'): Promise<void> {
    await this.#push.onToken(({ value }) => {
      if (!this.#auth.isAuthenticated()) return;
      this.#http
        .post(`${this.#apiUrl}/devices`, { token: value, platform })
        .subscribe({ error: () => undefined });
    });
    await this.#push.onTap(() => {
      // Os avisos levam data.type e data.orderId; a tela do pedido chega numa próxima etapa.
      void this.#router.navigateByUrl('/');
    });
  }
}
