import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Theme } from '@shared/service/theme/theme';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { TgToastRegionComponent } from '@shared/design-system/feedback/tg-toast-region.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TgToastRegionComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly #theme = inject(Theme);
  readonly #userLogged = inject(UserLoggedService);

  protected readonly title = signal('frontend');

  constructor() {
    effect(() => {
      this.#theme.setTheme(this.#userLogged.user()?.user?.type ?? 'CUSTOMER');
    });
  }
}
