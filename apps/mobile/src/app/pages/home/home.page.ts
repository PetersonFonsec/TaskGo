import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSkeletonText,
  IonText,
  IonThumbnail,
  IonTitle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logOutOutline, personCircleOutline, receiptOutline } from 'ionicons/icons';
import { catchError, map, of, startWith } from 'rxjs';

import { AuthService } from '@app/core/auth/auth.service';
import { CatalogService, matchesSearch } from '@app/core/catalog/catalog.service';
import { Category } from '@app/core/catalog/catalog.models';

type CategoriesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; categories: readonly Category[] };

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonSkeletonText,
    IonText,
    IonThumbnail,
    IonTitle,
    IonToolbar
  ],
  templateUrl: './home.page.html'
})
export class HomePage {
  readonly #catalog = inject(CatalogService);
  readonly auth = inject(AuthService);

  readonly term = signal('');
  readonly state = toSignal(
    this.#catalog.categories().pipe(
      map((categories): CategoriesState => ({ status: 'ready', categories })),
      catchError(() => of<CategoriesState>({ status: 'error' })),
      startWith<CategoriesState>({ status: 'loading' })
    ),
    { requireSync: true }
  );
  readonly visible = computed(() => {
    const state = this.state();
    if (state.status !== 'ready') return [];
    const term = this.term();
    return term
      ? state.categories.filter(
          (c) => matchesSearch(c.name, term) || matchesSearch(c.description ?? '', term)
        )
      : state.categories;
  });
  readonly firstName = computed(() => this.auth.user()?.name.split(' ')[0] ?? null);

  constructor() {
    addIcons({ logOutOutline, personCircleOutline, receiptOutline });
  }

  onSearch(event: CustomEvent<{ value?: string | null }>): void {
    this.term.set(event.detail.value ?? '');
  }

  logout(): void {
    void this.auth.logout();
  }
}
