import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { MOBILE_ENVIRONMENT } from '@app/core/config/mobile-environment.token';
import { DevicePlatform, NativePush } from './native-push';

export type PushSetupResult = 'registering' | 'denied' | 'unsupported';

/**
 * Situação do aparelho na API para a sessão atual.
 * `pending`: falha temporária, tenta de novo quando a rede ou o app voltam.
 * `failed`: a API recusou em definitivo; só um novo login ou token tenta de novo.
 * `unsupported`: token que a API não aceita (APNs cru no iOS, ver docs/mobile-app.md).
 */
export type DeviceRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'pending'
  | 'failed'
  | 'unsupported';

/**
 * Liga o aparelho à sessão do cliente: pede permissão, obtém o token e envia
 * para `POST /devices`. A API amarra o aparelho à sessão do access token, então o
 * registro vale para uma geração de sessão do AuthService e é refeito a cada login.
 */
@Injectable({ providedIn: 'root' })
export class PushRegistrationService {
  readonly #push = inject(NativePush);
  readonly #http = inject(HttpClient);
  readonly #auth = inject(AuthService);
  readonly #router = inject(Router);
  readonly #apiUrl = inject(MOBILE_ENVIRONMENT).apiUrl;
  #listening: Promise<void> | null = null;
  #platform: DevicePlatform | null = null;
  #deviceToken: string | null = null;
  /** Chave (sessão + token) já registrada ou em envio; evita POST duplicado. */
  #registeredKey: string | null = null;
  #inflightKey: string | null = null;

  readonly #status = signal<DeviceRegistrationStatus>('idle');
  readonly status = this.#status.asReadonly();

  /** Pede a permissão se ainda não foi decidida. Usar logo após o login. */
  enable(): Promise<PushSetupResult> {
    return this.#setup(true);
  }

  /** Reenvia o token só se a permissão já foi dada (abertura do app). */
  sync(): Promise<PushSetupResult> {
    return this.#setup(false);
  }

  /** Tenta de novo um registro que falhou por rede ou erro temporário. */
  retry(): Promise<void> {
    return this.#status() === 'pending' ? this.#register() : Promise.resolve();
  }

  async #setup(askIfUndecided: boolean): Promise<PushSetupResult> {
    const platform = this.#push.platform();
    if (!platform) return 'unsupported';

    let permission = (await this.#push.checkPermissions()).receive;
    if (askIfUndecided && permission.startsWith('prompt')) {
      permission = (await this.#push.requestPermissions()).receive;
    }
    if (permission !== 'granted') return 'denied';

    this.#platform = platform;
    this.#listening ??= this.#listen();
    await this.#listening;
    // Token já conhecido (de antes do login): registra para a sessão nova agora.
    void this.#register();
    await this.#push.register();
    return 'registering';
  }

  async #listen(): Promise<void> {
    await this.#push.onToken(({ value }) => {
      this.#deviceToken = value;
      void this.#register();
    });
    await this.#push.onTap(() => {
      // Os avisos levam data.type e data.orderId; a tela do pedido chega numa próxima etapa.
      void this.#router.navigateByUrl('/');
    });
  }

  async #register(): Promise<void> {
    const token = this.#deviceToken;
    const platform = this.#platform;
    // Sem sessão (antes do login ou depois do logout) o token só fica guardado em memória.
    if (!token || !platform || !this.#auth.isAuthenticated()) return;
    if (platform === 'IOS' && isRawApnsToken(token)) {
      this.#status.set('unsupported');
      return;
    }
    const generation = this.#auth.generation();
    const key = `${generation}:${token}`;
    if (key === this.#registeredKey || key === this.#inflightKey) return;

    this.#inflightKey = key;
    this.#status.set('registering');
    let status: DeviceRegistrationStatus;
    try {
      await firstValueFrom(this.#http.post(`${this.#apiUrl}/devices`, { token, platform }));
      status = 'registered';
    } catch (error) {
      status = isTransient(error) ? 'pending' : 'failed';
    } finally {
      if (this.#inflightKey === key) this.#inflightKey = null;
    }

    if (generation !== this.#auth.generation() || token !== this.#deviceToken) {
      // A sessão ou o token mudou durante o envio: o resultado não vale para o
      // estado atual. A API já solta aparelhos de sessões encerradas; registra
      // o token atual para a sessão atual, se houver.
      return this.#register();
    }
    if (status === 'registered') this.#registeredKey = key;
    this.#status.set(status);
  }
}

/** Token APNs cru: 64 caracteres hexadecimais. Tokens FCM têm outro formato. */
function isRawApnsToken(token: string): boolean {
  return /^[0-9a-f]{64}$/i.test(token);
}

/** Rede, limite de requisições ou erro do servidor: vale tentar de novo depois. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) return true;
  return error.status === 0 || error.status === 408 || error.status === 429 || error.status >= 500;
}
