import { Component } from '@angular/core';

import { FooterLinks } from '../footer-links/footer-links';
import { INSTITUTIONAL_LINKS, MENUS_LINKS, SOCIAL_LINKS } from './footer.data';

@Component({
  selector: 'app-footer',
  imports: [FooterLinks],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  institucionalLinks = INSTITUTIONAL_LINKS;
  socialLinks = SOCIAL_LINKS;
  menusLinks = MENUS_LINKS;
}
