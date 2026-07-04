import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';
import { navigationForRole } from '@app/core/navigation/admin-navigation';

@Component({
  selector: 'bo-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss'
})
export class AdminShellComponent {
  readonly #auth = inject(AdminAuthService);

  protected readonly operator = this.#auth.operator;
  protected readonly navigation = computed(() => {
    const operator = this.operator();
    return operator ? navigationForRole(operator.role) : [];
  });

  protected logout(): void {
    this.#auth.logout();
  }
}
