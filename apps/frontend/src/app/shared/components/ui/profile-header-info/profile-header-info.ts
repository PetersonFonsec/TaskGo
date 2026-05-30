import { Component, input } from '@angular/core';

import { FooterLinks } from '../footer-links/footer-links';
import { SOCIAL_LINKS } from '../footer/footer.data';
import { Avatar } from '../avatar/avatar';
import { Badge } from '../badge/badge';

@Component({
  selector: 'app-profile-header-info',
  imports: [Avatar, FooterLinks, Badge],
  templateUrl: './profile-header-info.html',
  styleUrl: './profile-header-info.scss',
})
export class ProfileHeaderInfo {
  services = input<string[]>(['Eletrica', 'Hidraulica', 'Pintura', 'Jardinagem']);
  socialLinks = SOCIAL_LINKS;
}
