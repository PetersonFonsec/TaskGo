import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Page } from '@shared/components/ui/page/page';

@Component({
  selector: 'app-customer',
  imports: [Page, RouterModule],
  templateUrl: './customer.html',
  styleUrl: './customer.scss',
})
export class Customer {

}
