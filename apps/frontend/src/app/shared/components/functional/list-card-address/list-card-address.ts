import { AddressForm } from '../../../../modules/general/profile/address/components/address-form/address-form';
import {
  CardAddressActions,
  CardAddressEvent,
} from '@shared/components/ui/card-address/card-address.constant';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { CardAddress } from '@shared/components/ui/card-address/card-address';
import { Address as AddressService } from '@shared/service/address/address';
import { IAddressEntity, IFullAddress } from '@shared/service/address/address.model';

@Component({
  selector: 'app-list-card-address',
  imports: [CardAddress, FaIconComponent, AddressForm],
  templateUrl: './list-card-address.html',
  styleUrl: './list-card-address.scss',
})
export class ListCardAddress implements OnInit {
  #addressService = inject(AddressService);

  addressCount = computed(() => this.address().length);
  address = signal<IFullAddress[]>([]);
  userId = input('');

  locationIcon = faLocationDot;
  plusIcon = faPlus;

  formOpen = signal(false);
  editing = signal<IFullAddress | null>(null);
  removing = signal<IFullAddress | null>(null);
  saving = signal(false);
  error = signal('');
  message = signal('');

  openForm(address: IFullAddress | null = null) {
    if (this.saving()) return;
    this.editing.set(address);
    this.removing.set(null);
    this.error.set('');
    this.message.set('');
    this.formOpen.set(true);
  }

  onAction(event: CardAddressEvent) {
    if (this.saving()) return;
    const address = this.address().find((item) => item.id === event.address_id);
    if (!address) return;
    this.formOpen.set(false);
    this.error.set('');
    this.message.set('');
    if (event.action === CardAddressActions.edit) this.openForm(address);
    else this.removing.set(address);
  }

  save(payload: IAddressEntity) {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const request = this.editing()
      ? this.#addressService.updateAddress(this.editing()!.id, payload)
      : this.#addressService.createAddress(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.message.set('Endereço salvo com sucesso.');
        this.loadAddresses();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Não foi possível salvar o endereço. Tente novamente.');
      },
    });
  }

  remove() {
    if (this.saving() || !this.removing()) return;
    this.saving.set(true);
    this.error.set('');
    this.#addressService.removeAddress(this.removing()!.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.removing.set(null);
        this.message.set('Endereço removido com sucesso.');
        this.loadAddresses();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Não foi possível remover o endereço. Tente novamente.');
      },
    });
  }

  ngOnInit(): void {
    this.loadAddresses();
  }

  loadAddresses() {
    this.#addressService.getAddress(this.userId(), 100).subscribe({
      next: (address) => {
        this.address.set(address.data);
      },
      error: () => this.error.set('Não foi possível carregar os endereços. Tente novamente.'),
    });
  }
}
