import { Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHouse, faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { IFullAddress } from '@shared/service/address/address.model';
import { Badge } from '../badge/badge';
import { CardAddressActions, CardAddressEvent } from './card-address.constant';

@Component({
  selector: 'app-card-address',
  imports: [FaIconComponent, Badge],
  templateUrl: './card-address.html',
  styleUrl: './card-address.scss',
})
export class CardAddress {
  action = output<CardAddressEvent>();
  address = input<IFullAddress>();
  events = CardAddressActions;
  icon = faHouse;
  editIcon = faPen;
  removeIcon = faTrashCan;

  onClick(action: CardAddressActions) {
    this.action.emit({
      action,
      address_id: this.address()?.id || '',
    });
  }
}
