import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';

import { TgBadgeComponent } from '@shared/design-system/badge/tg-badge.component';
import { TgButtonComponent } from '@shared/design-system/button/tg-button.component';
import { TgCardComponent } from '@shared/design-system/card/tg-card.component';
import { TgDialogComponent } from '@shared/design-system/dialog/tg-dialog.component';
import { TgSheetComponent } from '@shared/design-system/dialog/tg-sheet.component';
import { TgEmptyStateComponent } from '@shared/design-system/empty-state/tg-empty-state.component';
import { TgAlertComponent } from '@shared/design-system/feedback/tg-alert.component';
import { TgIconComponent } from '@shared/design-system/icon/tg-icon.component';
import { TgLoadingComponent, TgLoadingSkeletonDirective } from '@shared/design-system/skeleton/tg-loading.component';
import { TgSkeletonComponent } from '@shared/design-system/skeleton/tg-skeleton.component';
import { Address as AddressService } from '@shared/service/address/address';
import { IAddressEntity, IFullAddress } from '@shared/service/address/address.model';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { AddressForm } from './components/address-form/address-form';

/** "01001000" vira "01001-000"; outro formato fica como veio. */
export function formatCep(cep: string | null | undefined): string {
  const digits = (cep ?? '').replace(/\D/g, '');
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : (cep ?? '');
}

/** "Bairro · Cidade, UF", sem as partes que faltam. */
export function addressPlace(address: Pick<IFullAddress, 'neighborhood' | 'city' | 'state'>): string {
  const cityState = [address.city, address.state].filter(Boolean).join(', ');
  return [address.neighborhood, cityState].filter(Boolean).join(' · ');
}

/**
 * Endereços de quem está logado (Etapa 10), em `/general/:id/addresses`,
 * dentro do perfil da conta. Endpoints de antes: GET (até 100), POST, PATCH
 * e DELETE em /user/me/addresses; a busca do CEP é a mesma (BrasilAPI).
 */
@Component({
  selector: 'app-address',
  imports: [
    AddressForm,
    TgAlertComponent,
    TgBadgeComponent,
    TgButtonComponent,
    TgCardComponent,
    TgDialogComponent,
    TgEmptyStateComponent,
    TgIconComponent,
    TgLoadingComponent,
    TgLoadingSkeletonDirective,
    TgSheetComponent,
    TgSkeletonComponent,
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Address {
  readonly #addressService = inject(AddressService);
  readonly #session = inject(UserLoggedService);
  readonly #destroyRef = inject(DestroyRef);

  readonly formId = 'address-form';
  readonly formatCep = formatCep;
  readonly place = addressPlace;

  readonly addresses = signal<IFullAddress[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly count = computed(() => this.addresses().length);
  /** Sem nenhum endereço, o "Adicionar" fica só no estado vazio (uma ação por vez). */
  readonly showAdd = computed(() => !this.loading() && (this.loadError() || this.count() > 0));
  readonly lead = computed(() => {
    const count = this.count();
    if (this.loading() || this.loadError() || !count) return 'Os locais onde você recebe os serviços.';
    return count === 1 ? '1 endereço salvo.' : `${count} endereços salvos.`;
  });

  readonly sheet = viewChild.required<TgSheetComponent>('sheet');
  readonly removeDialog = viewChild.required<TgDialogComponent>('removeDialog');
  /** O formulário só existe com o painel aberto: cada abertura começa do zero. */
  readonly formOpen = signal(false);
  readonly editing = signal<IFullAddress | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal('');

  readonly removing = signal<IFullAddress | null>(null);
  readonly deleting = signal(false);
  readonly removeError = signal('');

  readonly message = signal('');

  /** Cada carga cancela a anterior; `silent` mantém a lista à vista enquanto recarrega. */
  readonly #loads = new Subject<{ silent: boolean }>();

  constructor() {
    this.#loads
      .pipe(
        startWith({ silent: false }),
        switchMap(({ silent }) => {
          if (!silent) this.loading.set(true);
          this.loadError.set(false);
          return this.#addressService.getAddress(this.#userId(), 100).pipe(
            map((response) => ({ ok: true as const, data: Array.isArray(response?.data) ? response.data : [] })),
            catchError(() => of({ ok: false as const })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.ok) this.addresses.set(result.data);
        this.loadError.set(!result.ok);
        this.loading.set(false);
      });
  }

  load(silent = false) {
    this.#loads.next({ silent });
  }

  openForm(address: IFullAddress | null = null) {
    if (this.saving() || this.deleting()) return;
    this.editing.set(address);
    this.saveError.set('');
    this.message.set('');
    this.formOpen.set(true);
    this.sheet().open();
  }

  onSheetClosed() {
    this.formOpen.set(false);
    this.saveError.set('');
  }

  save(payload: IAddressEntity) {
    if (this.saving()) return;
    const editing = this.editing();
    this.saving.set(true);
    this.saveError.set('');
    const request = editing
      ? this.#addressService.updateAddress(editing.id, payload)
      : this.#addressService.createAddress(payload);
    request.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.sheet().close();
        this.message.set(editing ? 'Endereço atualizado.' : 'Endereço adicionado.');
        this.load(true);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Não foi possível salvar o endereço. Confira os dados e tente de novo.');
      },
    });
  }

  askRemove(address: IFullAddress) {
    if (this.saving() || this.deleting()) return;
    this.removing.set(address);
    this.removeError.set('');
    this.message.set('');
    this.removeDialog().open();
  }

  remove() {
    const target = this.removing();
    if (this.deleting() || !target) return;
    this.deleting.set(true);
    this.removeError.set('');
    this.#addressService
      .removeAddress(target.id)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.removeDialog().close();
          this.message.set('Endereço removido.');
          this.load(true);
        },
        error: () => {
          this.deleting.set(false);
          this.removeError.set('Não foi possível remover o endereço. Tente de novo.');
        },
      });
  }

  /** A API usa a sessão (/user/me); o id vai só porque o serviço o pede. */
  #userId(): string {
    return String(this.#session.user()?.user?.id ?? '');
  }
}
