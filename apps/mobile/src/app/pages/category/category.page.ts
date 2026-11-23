import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonSkeletonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { CatalogService } from '@app/core/catalog/catalog.service';
import { PublicProvider } from '@app/core/catalog/catalog.models';
import { TgIconComponent } from '@app/shared/ui/tg-icon.component';

type ProvidersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; providers: readonly PublicProvider[] };

@Component({
  selector: 'app-category',
  imports: [
    RouterLink,
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonSkeletonText,
    IonTitle,
    IonToolbar,
    TgIconComponent
  ],
  templateUrl: './category.page.html',
  styleUrl: './category.page.scss'
})
export class CategoryPage {
  readonly #catalog = inject(CatalogService);

  /** Vêm da rota: /categorias/:slug?nome=... */
  readonly slug = input.required<string>();
  readonly nome = input<string>();

  readonly title = computed(() => this.nome() || 'Profissionais');
  readonly state = toSignal(
    toObservable(this.slug).pipe(
      switchMap((slug) =>
        this.#catalog.providersByCategory(slug).pipe(
          map((providers): ProvidersState => ({ status: 'ready', providers })),
          catchError(() => of<ProvidersState>({ status: 'error' })),
          startWith<ProvidersState>({ status: 'loading' })
        )
      )
    ),
    { initialValue: { status: 'loading' } as ProvidersState }
  );

  rating(provider: PublicProvider): string | null {
    const value = Number(provider.ratingAvg ?? 0);
    return provider.ratingCount && value > 0 ? value.toFixed(1).replace('.', ',') : null;
  }

  startingPrice(provider: PublicProvider): number | null {
    const prices = provider.services.map((s) => Number(s.basePrice)).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }

  /** Sem foto, o avatar mostra as iniciais (a foto sempre vence). */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters =
      parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
    return letters.toUpperCase();
  }

  formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
