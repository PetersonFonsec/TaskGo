import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { finalize, switchMap } from 'rxjs';

import { ProviderProfileSummary } from '@shared/components/ui/provider-profile-summary/provider-profile-summary';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Slider, SliderItemDirective } from '@shared/components/ui/slider/slider';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { FooterLinks } from '@shared/components/ui/footer-links/footer-links';
import { SOCIAL_LINKS } from '@shared/components/ui/footer/footer.data';
import { FullModal } from '@shared/components/ui/full-modal/full-modal';
import { Avatar } from '@shared/components/ui/avatar/avatar';
import { Provider } from '@shared/service/provider/provider';
import { Utils } from '@shared/service/utils/utils.service';
import { Card } from '@shared/components/forms/card/card';
import { Badge } from '@shared/components/ui/badge/badge';
import { environment } from '@environments/environment';
import { User } from '@shared/service/users/user';
import {
  hireProviderRequest,
  ProviderAvailabilityDay,
  ProviderAvailabilitySlot,
} from '@shared/service/provider/provider.model';

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
  imports: [Card, Slider, SliderItemDirective, ButtonComponent, FullModal, ProviderProfileSummary],
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
  error = signal('');
  favoritesEnabled = environment.features?.favoritesMvp ?? false;
  favoriteState = signal(false);
  favoriteLoading = signal(false);
  favoriteError = signal('');
  favoriteAnnouncement = signal('');
  availabilityDays = signal<ProviderAvailabilityDay[]>([]);
  availabilityTimezone = signal('');
  availabilityLoading = signal(false);
  availabilityError = signal('');
  selectedDate = signal<string | null>(null);
  selectedSlot = signal<ProviderAvailabilitySlot | null>(null);
  appointmentSummary = computed(() => {
    const day = this.availabilityDays().find((item) => item.date === this.selectedDate());
    const slot = this.selectedSlot();
    const service = this.selectedService();

    if (!day || !slot) {
      return null;
    }

    return {
      date: day.date,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      label: slot.label,
      timezone: this.availabilityTimezone(),
      serviceTitle: service?.title ?? 'Serviço',
      price: this.servicePrice(),
    };
  });
  hasAvailableSlots = computed(() =>
    this.availabilityDays().some((day) => this.dayHasAvailableSlots(day)),
  );
  selectedService = computed(() => this.provider()?.services?.[0] ?? null);
  servicePrice = computed(() => {
    const service = this.selectedService();
    const value = service?.basePrice ?? service?.price ?? this.provider()?.priceFrom ?? 0;

    return Number(value) || 0;
  });
  requestDisabled = computed(() => this.availabilityLoading() || !this.selectedSlot());

  socialLinks = SOCIAL_LINKS;

  ngOnInit(): void {
    this.#activatedRoute.params
      .pipe(switchMap(({ userId }) => this.#user.getProvider(userId)))
      .subscribe({
        next: (provider: any) => {
          this.provider.set(provider);
          this.loadAvailability(provider);
          if (this.favoritesEnabled) {
            this.loadFavoriteState(provider?.id);
          }
        },
      });
  }

  selectDate(date: string) {
    const day = this.availabilityDays().find((item) => item.date === date);
    if (!day || !this.dayHasAvailableSlots(day)) {
      return;
    }

    this.selectedDate.set(date);
    this.selectedSlot.set(null);
    this.error.set('');
  }

  selectSlot(slot: ProviderAvailabilitySlot) {
    if (!slot.available) {
      return;
    }

    this.selectedSlot.set(slot);
    this.error.set('');
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
      },
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
        const favoriteIds = (items as any[]).map((item) =>
          String(item.providerId ?? item.id ?? ''),
        );
        this.favoriteState.set(favoriteIds.includes(String(providerId)));
      },
    });
  }

  register() {
    const selectedSlot = this.selectedSlot();
    if (!selectedSlot) {
      this.error.set('Selecione um horário disponível antes de contratar.');
      this.#liveAnnouncer.announce('Selecione um horário disponível antes de contratar.');
      return;
    }

    const serviceId = this.selectedService()?.id;
    const loggedUser = this.#userLogged.user()?.user;

    if (!serviceId || !loggedUser?.id) {
      const message = 'Não foi possível identificar o cliente ou o serviço selecionado.';
      this.error.set(message);
      this.#liveAnnouncer.announce(message);
      return;
    }

    const address = loggedUser.addresses?.[0];

    const payload: hireProviderRequest = {
      serviceId,
      clientId: loggedUser.id,
      scheduledFor: selectedSlot.startsAt,
      finalPrice: this.servicePrice(),
      paymentMethod: 'PIX',
      ...(address ? { address } : {}),
    };

    this.#provider.hireProvider(payload).subscribe({
      next: (response) => {
        console.log(response);
        this.#liveAnnouncer.announce('Agendamento solicitado com sucesso');
        this.showModal.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.#liveAnnouncer.announce('Houve um erro ao solicitar o agendamento');
        this.error.set(this.getErrorMessage(error, 'Não foi possível criar a solicitação.'));
      },
    });
  }

  getSelectedDaySlots() {
    return this.availabilityDays().find((day) => day.date === this.selectedDate())?.slots ?? [];
  }

  formatDateLabel(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    })
      .format(parsedDate)
      .replace('.', '');
  }

  formatShortDate(date: string) {
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
    }).format(parsedDate);
  }

  formatPrice(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  dayHasAvailableSlots(day: ProviderAvailabilityDay) {
    return day.available && day.slots.some((slot) => slot.available);
  }

  goToHome() {
    this.#router.navigateByUrl(Utils.getRouteByRole(this.#userLogged.user().user?.type));
  }

  openFullProfile() {
    const providerId = this.provider()?.id;

    if (providerId) {
      this.#router.navigate(['/customer/profile', providerId]);
    }
  }

  private loadAvailability(provider: any) {
    const providerId = provider?.id;
    const serviceId = provider?.services?.[0]?.id;

    this.availabilityDays.set([]);
    this.availabilityTimezone.set('');
    this.availabilityError.set('');
    this.selectedDate.set(null);
    this.selectedSlot.set(null);

    if (!providerId) {
      return;
    }

    const range = this.getAvailabilityRange();
    this.availabilityLoading.set(true);

    this.#provider
      .getAvailability(String(providerId), {
        ...range,
        serviceId,
      })
      .pipe(finalize(() => this.availabilityLoading.set(false)))
      .subscribe({
        next: (response) => {
          const days = response?.days ?? [];
          this.availabilityDays.set(days);
          this.availabilityTimezone.set(response?.timezone ?? '');
          this.selectedDate.set(this.findFirstAvailableDate(days));
        },
        error: (error: HttpErrorResponse) => {
          this.availabilityError.set(
            this.getErrorMessage(error, 'Não foi possível carregar os horários disponíveis.'),
          );
        },
      });
  }

  private getAvailabilityRange() {
    const from = new Date();
    const to = new Date(from);
    to.setDate(from.getDate() + 13);

    return {
      from: this.toDateInputValue(from),
      to: this.toDateInputValue(to),
    };
  }

  private toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private findFirstAvailableDate(days: ProviderAvailabilityDay[]) {
    return days.find((day) => this.dayHasAvailableSlots(day))?.date ?? null;
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string) {
    const message = error.error?.message;

    if (Array.isArray(message)) {
      return message[0] ?? fallback;
    }

    return message || error.error?.error || fallback;
  }
}
