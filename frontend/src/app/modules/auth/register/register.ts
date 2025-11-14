import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from "@angular/router";
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { StepsLines } from '@shared/components/forms/steps-lines/steps-lines';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { UserStorage } from '@shared/service/users/user-storage';
import { Utils } from '@shared/service/utils/utils.service';
import { Badge } from '@shared/components/ui/badge/badge';
import { Step } from '@shared/components/forms/step/step';
import { Roles } from '@shared/enums/roles.enum';

import { RegisterUser } from '../services/register-user/register-user';
import { CompleteStepsPipe } from '../pipes/complete-steps-pipe';
import { Theme } from '@shared/service/theme/theme';

@Component({
  selector: 'app-register',
  imports: [
    ButtonComponent,
    StepsLines,
    Step,
    RouterLink,
    FullModal,
    CompleteStepsPipe,
    Badge
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #userStorage = inject(UserStorage);
  #router = inject(Router);
  #theme = inject(Theme);

  userType = this.#userStorage.type();
  currentUser = this.getCurrentUser();
  showModal = signal(false);
  error = signal("");
  roles = Roles;

  getCurrentUser() {
    if (this.#userStorage.type() === Roles.CUSTOMER) {
      return this.#userStorage.customer();
    }

    return this.#userStorage.provider();
  }

  register() {
    this.#registerUser.register().subscribe({
      next: ({ user }) => {
        this.#liveAnnouncer.announce("Conta criada com sucesso");
        this.#router.navigateByUrl(Utils.getRouteByRole(user.type));
      },
      error: (error: HttpErrorResponse) => {
        this.#liveAnnouncer.announce("Houve um erro ao criar a sua conta");
        this.error.set(error.error.message);
      }
    })
  }

  goToHome() {
    this.#router.navigateByUrl('/customer');
  }
}
