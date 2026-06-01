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
import { environment } from '@environments/environment';


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
  #userLogged = inject(UserLoggedService);
  #activatedRoute = inject(ActivatedRoute);
  #liveAnnouncer = inject(LiveAnnouncer);
  #provider = inject(Provider);
  #router = inject(Router);
  #user = inject(User);

  provider = signal<any>({});
  showModal = signal(false);
  error = signal("");
  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favoriteState = signal(false);
  favoriteLoading = signal(false);
  favoriteError = signal("");
  favoriteAnnouncement = signal("");

  socialLinks = SOCIAL_LINKS;

  ngOnInit(): void {
    this.#activatedRoute.params.pipe(
      switchMap(({ userId }) =>
        this.#user.getProvider(userId)
      )
    ).subscribe({
      next: (provider: any) => {
        this.provider.set(provider);
        if (this.favoritesEnabled) {
          this.loadFavoriteState(provider?.id);
        }
      }
    });
  }

  toggleFavorite() {
    if (!this.favoritesEnabled || this.favoriteLoading()) {
      return;
    }

    const clientId = this.#userLogged.user().user?.id;
    const providerId = this.provider()?.id;

    if (!clientId || !providerId) {
      this.favoriteError.set('Não é possível atualizar favoritos no momento.');
      return;
    }

    const nextState = !this.favoriteState();
    this.favoriteLoading.set(true);
    this.favoriteError.set('');
    this.favoriteState.set(nextState);

    const request = nextState
      ? this.#provider.addFavorite(String(clientId), String(providerId))
      : this.#provider.removeFavorite(String(clientId), String(providerId));

    request.subscribe({
      next: () => {
        const message = nextState
          ? 'Profissional adicionado aos favoritos.'
          : 'Profissional removido dos favoritos.';

        this.favoriteAnnouncement.set(message);
        this.#liveAnnouncer.announce(message);
      },
      error: (error: HttpErrorResponse) => {
        this.favoriteState.set(!nextState);
        this.favoriteError.set(error.error?.message || 'Erro ao atualizar o favorito.');
        this.#liveAnnouncer.announce('Não foi possível atualizar o favorito.');
      },
      complete: () => {
        this.favoriteLoading.set(false);
      }
    });
  }

  private loadFavoriteState(providerId: any) {
    const clientId = this.#userLogged.user().user?.id;
    if (!clientId || !providerId) {
      return;
    }

    this.#provider.listFavorites(String(clientId)).subscribe({
      next: (response: any) => {
        const items = response?.items ?? response ?? [];
        const favoriteIds = (items as any[]).map(item => String(item.providerId ?? item.id ?? ''));
        this.favoriteState.set(favoriteIds.includes(String(providerId)));
      }
    });
  }

  register() {
    const payload: hireProviderRequest = {
      serviceId: this.provider().services[0].id,
      clientId: this.#userLogged.user().user?.id,
      finalPrice: 0,
      paymentMethod: 'PIX',
      address: this.#userLogged.user().user?.addresses[0]
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
    this.#router.navigateByUrl(Utils.getRouteByRole(this.#userLogged.user().user?.type));
  }
}
