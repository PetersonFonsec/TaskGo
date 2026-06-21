import { Component, inject, OnInit, signal } from '@angular/core';

import { ListCardAddress } from '@shared/components/functional/list-card-address/list-card-address';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Address as AddressService } from '@shared/service/address/address';
import { IAddressEntity } from '@shared/service/address/address.model';
import { LiveAnnouncer } from '@angular/cdk/a11y';


@Component({
  selector: 'app-address',
  imports: [
    ListCardAddress
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address {
  user = inject(UserLoggedService).user().user;
  #addressService = inject(AddressService);
  #liveAnnouncer = inject(LiveAnnouncer);
  error = signal("");

  createAddress(payload: IAddressEntity) {
    this.#addressService.createAddress(payload).subscribe({
      next: () => {
        this.#liveAnnouncer.announce("Endereço criado com sucesso");
      },
      error: (error: any) => {
        this.#liveAnnouncer.announce("Houve um erro ao criar o endereço");
        this.error.set(error.error.message);
      }
    });
  }
}
