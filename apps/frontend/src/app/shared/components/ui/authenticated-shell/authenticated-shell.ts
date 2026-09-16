import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Theme } from '@shared/service/theme/theme';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';

@Component({
  selector: 'app-authenticated-shell',
  imports: [Footer, Header, RouterOutlet],
  template: `
    <div class="authenticated-shell" data-testid="authenticated-shell">
      <app-header class="authenticated-shell_header" />

      <main class="authenticated-shell_main">
        <div class="authenticated-shell_content">
          <router-outlet />
        </div>
      </main>

      <app-footer class="authenticated-shell_footer" />
    </div>
  `,
  styles: `
    .authenticated-shell {
      background: var(--proxi-background);
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      width: 100%;

      &_header {
        position: sticky;
        top: 0;
        width: 100%;
        z-index: 20;
      }

      &_main {
        display: flex;
        flex: 1;
        min-width: 0;
        width: 100%;
      }

      &_content {
        flex: 1;
        min-width: 0;
        padding: var(--proxi-page-padding);
      }

      &_footer {
        width: 100%;
      }
    }
  `,
})
export class AuthenticatedShell {
  private readonly theme = inject(Theme);
  private readonly session = inject(UserLoggedService);

  constructor() {
    effect(() => this.theme.setTheme(this.session.user()?.user?.type ?? 'CUSTOMER'));
  }
}
