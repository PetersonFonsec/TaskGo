import { Component, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faHome } from '@fortawesome/free-solid-svg-icons';
import { IAddressEntity } from '@shared/service/address/address.model';
import { Badge } from '../badge/badge';


@Component({
  selector: 'app-card-address',
  imports: [FaIconComponent, Badge],
  templateUrl: './card-address.html',
  styleUrl: './card-address.scss',
})
export class CardAddress {
  address = input<IAddressEntity>();
  icon = faHome; 
}
