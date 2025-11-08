import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

export interface FooterLinksParam {
  text: string;
  link: string;
  type: "text" | "icon";
  icon?: any;
}

@Component({
  selector: 'app-footer-links',
  imports: [RouterModule, FontAwesomeModule],
  templateUrl: './footer-links.html',
  styleUrl: './footer-links.scss',
})
export class FooterLinks {
  links = input<FooterLinksParam[]>();
  direction = input('column');
  title = input();
}
