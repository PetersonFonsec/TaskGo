import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormsModule } from '@angular/forms';

import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { AlertComponent } from '@shared/components/ui/alert/alert.component';
import { fadeAnimation } from '@shared/animations/fade/fade.animation';
import { UserRegister } from '@shared/service/users/user-register';
import { Utils } from '@shared/service/utils/utils.service';

@Component({
  selector: 'app-login',
  imports: [
    InputTextComponent,
    ButtonComponent,
    RouterLink,
    FormsModule,
    AlertComponent,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  animations: [fadeAnimation]
})
export class Login {
  #liveAnnouncer = inject(LiveAnnouncer);
  #userRegister = inject(UserRegister);
  #router = inject(Router);
  error = signal("");
  payload: any = {};

  login() {
    this.#userRegister.login(this.payload).subscribe({
      next: ({ user }) => {
        this.#liveAnnouncer.announce("Login realizado com sucesso");
        this.#router.navigateByUrl(Utils.getRouteByRoleBack(user.type));
      },
      error: (error: HttpErrorResponse) => {
        this.#liveAnnouncer.announce("Houve um erro ao realizar login");
        this.error.set(error.error.message);
      }
    })
  }
}
