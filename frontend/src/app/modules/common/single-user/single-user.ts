import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { switchMap } from 'rxjs';

import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { FooterLinks } from '@shared/components/ui/footer-links/footer-links';
import { hireProviderRequest } from '@shared/service/provider/provider.model';
import { SOCIAL_LINKS } from '@shared/components/ui/footer/footer.data';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { Avatar } from '@shared/components/ui/avatar/avatar';
import { Provider } from '@shared/service/provider/provider';
import { Utils } from '@shared/service/utils/utils.service';
import { Card } from '@shared/components/forms/card/card';
import { Badge } from '@shared/components/ui/badge/badge';
import { User } from '@shared/service/users/user';


/**
 * TODO: Por conta do prazo de entraga do projeto
 * estou limitando alguns valores.
 *
 * Exemplo valor cobrado por um determinado serviço
 * qual serviço o usuario esta querendo contratar
 * qual endereço o custumer que usar
 */
@Component({
  selector: 'app-single-user',
  imports: [
    Avatar,
    Badge,
    Card,
    Slider,
    SliderItemDirective,
    FooterLinks,
    ButtonComponent,
    FullModal
  ],
  templateUrl: './single-user.html',
  styleUrl: './single-user.scss',
})
export class SingleUser implements OnInit {
  #userLogged = inject(UserLoggedService).user().user;
  #activatedRoute = inject(ActivatedRoute);
  #liveAnnouncer = inject(LiveAnnouncer);
  #provider = inject(Provider);
  #router = inject(Router);
  #user = inject(User);

  provider = signal<any>({});
  showModal = signal(false);
  error = signal("");

  socialLinks = SOCIAL_LINKS;

  ngOnInit(): void {
    this.#activatedRoute.params.pipe(
      switchMap(({ userId }) =>
        this.#user.getProvider(userId)
      )
    ).subscribe({
      next: (provider: any) => {
        this.provider.set(provider);
      }
    });
  }

  register() {
    const payload: hireProviderRequest = {
      serviceId: this.provider().services[0].id,
      clientId: this.#userLogged.id,
      finalPrice: 0,
      paymentMethod: 'PIX',
      address: this.#userLogged.addresses[0]
    };

    this.#provider.hireProvider(payload).subscribe({
      next: (response) => {
        console.log(response);
        this.#liveAnnouncer.announce("Conta criada com sucesso");
        this.showModal.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.#liveAnnouncer.announce("Houve um erro ao criar a sua conta");
        this.error.set(error.error.message[0]);
      }
    });
  }

  goToHome() {
    this.#router.navigateByUrl(Utils.getRouteByRole(this.#userLogged.type));
  }
}
