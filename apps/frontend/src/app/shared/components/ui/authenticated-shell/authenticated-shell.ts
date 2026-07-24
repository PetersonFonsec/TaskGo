import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Aside } from '../aside/aside';
import { Footer } from '../footer/footer';
import { Header } from '../header/header';

@Component({
  selector: 'app-authenticated-shell',
  imports: [Aside, CdkTrapFocus, Footer, Header, RouterOutlet],
  template: `
    <div class="authenticated-shell" data-testid="authenticated-shell">
      <app-header
        class="authenticated-shell_header"
        [menuOpen]="drawerOpen()"
        (menuToggle)="toggleDrawer()"
      />

      @if (drawerOpen()) {
        <div
          class="authenticated-shell_backdrop"
          data-testid="mobile-navigation-backdrop"
          (click)="closeDrawer()"
        >
          <aside
            id="mobile-navigation-drawer"
            class="authenticated-shell_drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu da conta"
            data-state="open"
            data-testid="mobile-navigation-drawer"
            cdkTrapFocus
            [cdkTrapFocusAutoCapture]="true"
            (click)="$event.stopPropagation()"
            (keydown.escape)="closeDrawer()"
          >
            <button
              class="authenticated-shell_close"
              type="button"
              aria-label="Fechar menu"
              data-testid="mobile-navigation-close"
              cdkFocusInitial
              (click)="closeDrawer()"
            >
              <span aria-hidden="true">×</span>
            </button>
            <app-aside />
          </aside>
        </div>
      }

      <main class="authenticated-shell_main">
        <div class="authenticated-shell_rail" data-testid="desktop-navigation-rail">
          <app-aside />
        </div>
        <div class="authenticated-shell_content">
          <router-outlet />
        </div>
      </main>

      <app-footer class="authenticated-shell_footer" />
    </div>
  `,
  styles: `
    @use "variables/breakpoints";

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

      &_rail {
        display: none;
      }

      &_footer {
        width: 100%;
      }

      &_backdrop {
        animation: authenticated-shell-backdrop-in 160ms ease-out;
        background: rgba(15, 23, 42, 0.52);
        inset: 0;
        position: fixed;
        z-index: 30;
      }

      &_drawer {
        animation: authenticated-shell-drawer-in 160ms ease-out;
        background: var(--proxi-surface);
        box-shadow: 8px 0 24px rgba(15, 23, 42, 0.18);
        height: 100%;
        max-width: calc(100vw - 48px);
        overflow-y: auto;
        position: relative;
        width: 280px;
      }

      &_close {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: 10px;
        color: var(--proxi-text);
        cursor: pointer;
        display: flex;
        font-size: 30px;
        height: 44px;
        justify-content: center;
        margin: 10px 12px 0 auto;
        width: 44px;

        &:focus-visible {
          outline: 2px solid var(--proxi-primary);
          outline-offset: 2px;
        }
      }

      @media (min-width: breakpoints.$tablet) {
        &_rail {
          display: flex;
          flex: 0 0 280px;

          app-aside {
            width: 100%;
          }
        }

        &_backdrop {
          display: none;
        }
      }
    }

    @keyframes authenticated-shell-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes authenticated-shell-drawer-in {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .authenticated-shell_backdrop,
      .authenticated-shell_drawer {
        animation-duration: 1ms;
      }
    }
  `,
})
export class AuthenticatedShell {
  readonly #destroyRef = inject(DestroyRef);
  readonly #router = inject(Router);
  private readonly header = viewChild(Header);

  protected readonly drawerOpen = signal(false);

  constructor() {
    this.#router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        if (this.drawerOpen()) {
          this.closeDrawer();
        }
      });
  }

  protected toggleDrawer(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
      return;
    }

    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    if (!this.drawerOpen()) {
      return;
    }

    this.drawerOpen.set(false);
    Promise.resolve().then(() => this.header()?.focusMenuTrigger());
  }
}
