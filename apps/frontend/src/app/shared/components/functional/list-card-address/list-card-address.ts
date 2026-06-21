import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CardAddress } from '@shared/components/ui/card-address/card-address';
import { Address as AddressService } from '@shared/service/address/address';
import { IAddressEntity } from '@shared/service/address/address.model';

@Component({
  selector: 'app-list-card-address',
  imports: [CardAddress],
  templateUrl: './list-card-address.html',
  styleUrl: './list-card-address.scss',
})
export class ListCardAddress implements OnInit {
  #addressService = inject(AddressService);
  address = signal<IAddressEntity[]>([]);
  userId = input("");

  ngOnInit(): void {
    this.#addressService.getAddress(this.userId()).subscribe({
      next: (address) => {
        this.address.set(address.data)
      }
    })
  }
}
