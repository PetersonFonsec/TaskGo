import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  IonAvatar,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSkeletonText,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { personCircle, shieldCheckmark, star } from 'ionicons/icons';
import { catchError, firstValueFrom, map, Observable, of, startWith, switchMap } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { Availability, ProviderProfile, SavedAddress } from '@app/core/orders/orders.models';
import { createOrderErrorMessage, OrdersService } from '@app/core/orders/orders.service';

type Load<T> = { status: 'loading' } | { status: 'error' } | { status: 'ready'; value: T };

@Component({
  selector: 'app-provider',
  imports: [
    IonAvatar,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonChip,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonSkeletonText,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './provider.page.html',
  styles: `
    .days {
      display: flex;
      overflow-x: auto;
      white-space: nowrap;
    }
    .days ion-chip {
      flex: none;
    }
  `
})
export class ProviderPage {
  readonly #orders = inject(OrdersService);
  readonly #router = inject(Router);
  readonly auth = inject(AuthService);

  /** Vem da rota: /prestadores/:id */
  readonly id = input.required<string>();

  readonly profile = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => loading(this.#orders.provider(id)))
    ),
    { initialValue: { status: 'loading' } as Load<ProviderProfile | null> }
  );
  readonly provider = computed(() => {
    const state = this.profile();
    return state.status === 'ready' ? state.value : null;
  });

  readonly #chosenService = signal<string | null>(null);
  readonly serviceId = computed(
    () => this.#chosenService() ?? (this.provider()?.services[0]?.id?.toString() ?? null)
  );
  readonly service = computed(
    () => this.provider()?.services.find((s) => String(s.id) === this.serviceId()) ?? null
  );

  readonly agenda = toSignal(
    toObservable(computed(() => [this.provider()?.id, this.serviceId()] as const)).pipe(
      switchMap(([providerId, serviceId]) =>
        providerId != null && serviceId
          ? loading(this.#orders.availability(String(providerId), serviceId))
          : of<Load<Availability>>({ status: 'loading' })
      )
    ),
    { initialValue: { status: 'loading' } as Load<Availability> }
  );
  readonly days = computed(() => {
    const agenda = this.agenda();
    return agenda.status === 'ready'
      ? agenda.value.days.filter((day) => day.available && day.slots.some((s) => s.available))
      : [];
  });
  readonly timezone = computed(() => {
    const agenda = this.agenda();
    return agenda.status === 'ready' ? agenda.value.timezone : 'America/Sao_Paulo';
  });
  readonly #chosenDate = signal<string | null>(null);
  readonly date = computed(() => {
    const chosen = this.#chosenDate();
    const days = this.days();
    return days.some((d) => d.date === chosen) ? chosen : (days[0]?.date ?? null);
  });
  readonly slots = computed(
    () => this.days().find((d) => d.date === this.date())?.slots.filter((s) => s.available) ?? []
  );
  readonly #chosenSlot = signal<string | null>(null);
  readonly slot = computed(
    () => this.slots().find((s) => s.startsAt === this.#chosenSlot()) ?? null
  );

  readonly addresses = toSignal(
    toObservable(this.auth.isAuthenticated).pipe(
      switchMap((signedIn) =>
        signedIn ? loading(this.#orders.addresses()) : of(null)
      )
    ),
    { initialValue: null as Load<readonly SavedAddress[]> | null }
  );
  readonly #chosenAddress = signal<string | null>(null);
  readonly addressId = computed(() => {
    const state = this.addresses();
    if (state?.status !== 'ready') return null;
    const list = state.value;
    const chosen = this.#chosenAddress();
    if (list.some((a) => a.id === chosen)) return chosen;
    return (list.find((a) => a.isDefault) ?? list[0])?.id ?? null;
  });

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  /** Sem sessão o botão leva ao login, então fica sempre ativo. */
  readonly canSubmit = computed(
    () =>
      !this.auth.isAuthenticated() ||
      (!this.submitting() && !!this.service() && !!this.slot() && !!this.addressId())
  );

  constructor() {
    addIcons({ personCircle, shieldCheckmark, star });
  }

  selectService(id: string): void {
    this.#chosenService.set(id);
    this.#chosenDate.set(null);
    this.#chosenSlot.set(null);
    this.error.set(null);
  }

  selectDate(date: string): void {
    this.#chosenDate.set(date);
    this.#chosenSlot.set(null);
  }

  selectSlot(startsAt: string): void {
    this.#chosenSlot.set(startsAt);
    this.error.set(null);
  }

  selectAddress(id: string): void {
    this.#chosenAddress.set(id);
  }

  async submit(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.#router.navigate(['/entrar'], {
        queryParams: { voltar: `/prestadores/${this.id()}` }
      });
      return;
    }
    const service = this.service();
    const slot = this.slot();
    const addressId = this.addressId();
    if (this.submitting() || !service || !slot || !addressId) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      const order = await firstValueFrom(
        this.#orders.create({
          serviceId: String(service.id),
          scheduledFor: slot.startsAt,
          addressId
        })
      );
      await this.#router.navigate(['/pedidos', order.id], { replaceUrl: true });
    } catch (error) {
      this.error.set(createOrderErrorMessage(error));
      this.#chosenSlot.set(null);
    } finally {
      this.submitting.set(false);
    }
  }

  rating(): string | null {
    const provider = this.provider();
    const value = Number(provider?.ratingAvg ?? 0);
    return provider?.ratingCount && value > 0 ? value.toFixed(1).replace('.', ',') : null;
  }

  dayLabel(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
      .format(new Date(year, month - 1, day))
      .replace(/\./g, '');
  }

  timeLabel(startsAt: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: this.timezone()
    }).format(new Date(startsAt));
  }

  addressLabel(address: SavedAddress): string {
    const street = [address.street, address.number].filter(Boolean).join(', ');
    return [address.label, street, address.neighborhood].filter(Boolean).join(' · ');
  }

  formatPrice(value: number): string {
    return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  reviewDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
      new Date(value)
    );
  }
}

function loading<T>(source: Observable<T>) {
  return source.pipe(
    map((value): Load<T> => ({ status: 'ready', value })),
    catchError(() => of<Load<T>>({ status: 'error' })),
    startWith<Load<T>>({ status: 'loading' })
  );
}
