import { Component, inject, OnInit, signal } from '@angular/core';

import { TabContentDirective, TabHeaderDirective, TabsComponent } from '@shared/components/ui/tabs/tabs.component';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { Address as AddressService } from '@shared/service/address/address';
import { TabComponent } from '@shared/components/ui/tab/tab.component';
import { AddressForm } from './components/address-form/address-form';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { IAddressEntity } from '@shared/service/address/address.model';
import { AlertComponent } from '@shared/components/ui/alert/alert.component';

@Component({
  selector: 'app-address',
  imports: [
    TabsComponent,
    TabComponent,
    TabContentDirective,
    TabHeaderDirective,
    AddressForm,
    AlertComponent
  ],
  templateUrl: './address.html',
  styleUrl: './address.scss',
})
export class Address implements OnInit {
  #user = inject(UserLoggedService).user().user;
  #addressService = inject(AddressService);
  #liveAnnouncer = inject(LiveAnnouncer);

  address = signal<any[]>([]);
  error = signal("");

  ngOnInit() {
    this.#addressService.getAddress(this.#user.id).subscribe({
      next: (response) => {
        console.log(response);
        this.address.set(response.data);
      },
      error: (error) => {
        console.error('Error fetching address:', error);
      }
    });
  }

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
