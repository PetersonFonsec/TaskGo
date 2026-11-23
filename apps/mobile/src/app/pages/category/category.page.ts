import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonAvatar,
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { CatalogService } from '@app/core/catalog/catalog.service';
import { PublicProvider } from '@app/core/catalog/catalog.models';
import { registerTgIcons } from '@app/core/ui/tg-icons';

type ProvidersState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; providers: readonly PublicProvider[] };

@Component({
  selector: 'app-category',
  imports: [
    RouterLink,
    IonAvatar,
    IonBackButton,
    IonBadge,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSkeletonText,
    IonTitle,
    IonToolbar
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

  constructor() {
    registerTgIcons();
  }

  rating(provider: PublicProvider): string | null {
    const value = Number(provider.ratingAvg ?? 0);
    return provider.ratingCount && value > 0 ? value.toFixed(1).replace('.', ',') : null;
  }

  startingPrice(provider: PublicProvider): number | null {
    const prices = provider.services.map((s) => Number(s.basePrice)).filter((p) => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }

  formatPrice(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
