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
    <div class="authenticated-shell tg-nav-offset" data-testid="authenticated-shell">
      <app-header />

      <main id="conteudo" class="authenticated-shell_main">
        <div class="authenticated-shell_content">
          <router-outlet />
        </div>
      </main>

      <app-footer class="authenticated-shell_footer" />
    </div>
  `,
  styles: `
    // Fundo e texto do Design System: o tema (cliente claro, prestador
    // escuro) troca os valores. A classe tg-nav-offset abre espaço para a
    // barra de abas abaixo de 1024 px, inclusive para o rodapé.
    .authenticated-shell {
      background: var(--tg-bg-canvas);
      color: var(--tg-text-primary);
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      width: 100%;

      &_main {
        display: flex;
        flex: 1;
        min-width: 0;
        width: 100%;

        &:focus {
          outline: none;
        }
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

    // Ponte para as telas ainda não migradas: no tema do profissional
    // (escuro), os tokens antigos --proxi-* passam a apontar para os do
    // Design System, para o texto e as superfícies seguirem o fundo escuro.
    // Sai quando a última tela deixar de usar --proxi-*.
    :host-context([data-theme='PROVIDER']) .authenticated-shell {
      --proxi-surface: var(--tg-bg-surface);
      --proxi-background: var(--tg-bg-subtle);
      --proxi-text: var(--tg-text-primary);
      --proxi-text-muted: var(--tg-text-secondary);
      --proxi-border: var(--tg-border-default);
      --proxi-primary-soft: var(--tg-action-subtle);
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
