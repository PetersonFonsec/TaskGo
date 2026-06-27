import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { faLocationDot, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';

import { CardAddress } from '@shared/components/ui/card-address/card-address';
import { Address as AddressService } from '@shared/service/address/address';
import { IFullAddress } from '@shared/service/address/address.model';

@Component({
  selector: 'app-list-card-address',
  imports: [CardAddress, FaIconComponent],
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

  ngOnInit(): void {
    this.#addressService.getAddress(this.userId()).subscribe({
      next: (address) => {
        this.address.set(address.data);
      },
    });
  }
}
