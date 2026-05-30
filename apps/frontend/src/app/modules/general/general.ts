import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Page } from '@shared/components/ui/page/page';

@Component({
  selector: 'app-general',
  imports: [Page, RouterOutlet],
  templateUrl: './general.html',
  styleUrl: './general.scss',
})
export class General {

}
