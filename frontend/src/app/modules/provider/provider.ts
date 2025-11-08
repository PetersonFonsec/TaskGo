import { Component } from '@angular/core';
import { Page } from '@shared/components/ui/page/page';
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-provider',
  imports: [Page, RouterModule],
  templateUrl: './provider.html',
  styleUrl: './provider.scss',
})
export class Provider {

}
