import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Theme } from '@shared/service/theme/theme';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
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
