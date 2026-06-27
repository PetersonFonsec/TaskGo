import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';

import { User } from '@shared/service/users/user';

@Component({
  selector: 'app-provider-profile',
  imports: [RouterLink],
  templateUrl: './provider-profile.html',
  styleUrl: './provider-profile.scss',
})
export class ProviderProfile implements OnInit {
  readonly #route = inject(ActivatedRoute);
  readonly #userService = inject(User);

  provider = signal<any>(null);
  loading = signal(true);
  error = signal('');

  user = computed(() => this.provider()?.user ?? this.provider() ?? {});
  reviews = computed<any[]>(() => this.provider()?.reviews ?? this.user()?.reviews ?? []);
  services = computed<any[]>(() => this.provider()?.services ?? []);
  rating = computed(() => {
    const value = this.provider()?.ratingAvg ?? this.provider()?.provider?.ratingAvg;
    return typeof value === 'number' ? value : Number(value?.s ?? value?.value ?? 0);
  });

  ngOnInit(): void {
    this.#route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.error.set('');
          return this.#userService
            .getProvider(params.get('userId') ?? '')
            .pipe(finalize(() => this.loading.set(false)));
        }),
      )
      .subscribe({
        next: (provider) => this.provider.set(provider),
        error: (error: HttpErrorResponse) => {
          this.error.set(
            error.error?.message || 'Não foi possível carregar o perfil deste profissional.',
          );
        },
      });
  }

  formatRating(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value || 0);
  }

  formatMemberSince(value: string | undefined) {
    if (!value) return 'Data não informada';

    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      new Date(value),
    );
  }

  phoneHref(phone: string | undefined) {
    return `tel:${(phone ?? '').replace(/[^+\d]/g, '')}`;
  }
}
