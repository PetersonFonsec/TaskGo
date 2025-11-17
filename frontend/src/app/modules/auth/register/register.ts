import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from "@angular/router";
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Subscription } from 'rxjs';

import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { StepsLines } from '@shared/components/forms/steps-lines/steps-lines';
import { AlertComponent } from '@shared/components/ui/alert/alert.component';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { UserStorage } from '@shared/service/users/user-storage';
import { Utils } from '@shared/service/utils/utils.service';
import { Badge } from '@shared/components/ui/badge/badge';
import { Step } from '@shared/components/forms/step/step';
import { Theme } from '@shared/service/theme/theme';
import { Roles } from '@shared/enums/roles.enum';

import { RegisterUser } from '../services/register-user/register-user';

@Component({
  selector: 'app-register',
  imports: [
    ButtonComponent,
    StepsLines,
    Step,
    RouterLink,
    FullModal,
    Badge,
    AlertComponent
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register implements OnInit, OnDestroy {
  #liveAnnouncer = inject(LiveAnnouncer);
  #registerUser = inject(RegisterUser);
  #userStorage = inject(UserStorage);
  #router = inject(Router);
  #theme = inject(Theme);

  completeSteps = this.#registerUser.completeSteps();
  currentUser = this.#userStorage.user();
  userType = this.#userStorage.type();
  subsction = new Subscription();
  showModal = signal(false);
  error = signal("");
  roles = Roles;

  ngOnInit(): void {
    this.currentUser = this.#userStorage.user();

    this.subsction = this.#theme.change.subscribe((role) => {
      this.userType = this.#userStorage.type();
    });
  }

  ngOnDestroy(): void {
    this.subsction?.unsubscribe();
  }

  changeTheme(role: Roles) {
    this.userType = role;
    this.#theme.setTheme(role);
  }

  register() {
    this.#registerUser.register().subscribe({
      next: ({ user }) => {
        this.#liveAnnouncer.announce("Conta criada com sucesso");
        this.showModal.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.#liveAnnouncer.announce("Houve um erro ao criar a sua conta");
        this.error.set(error.error.message[0]);
      }
    })
  }

  goToHome() {
    this.#router.navigateByUrl(Utils.getRouteByRole(this.userType));
  }
}
