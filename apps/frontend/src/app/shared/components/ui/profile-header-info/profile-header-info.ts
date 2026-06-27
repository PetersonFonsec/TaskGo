import { Component, computed, input } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';

import { FooterLinks } from '../footer-links/footer-links';
import { SOCIAL_LINKS } from '../footer/footer.data';
import { Avatar } from '../avatar/avatar';

@Component({
  selector: 'app-profile-header-info',
  imports: [Avatar, FooterLinks, FaIconComponent],
  templateUrl: './profile-header-info.html',
  styleUrl: './profile-header-info.scss',
})
export class ProfileHeaderInfo {
  services = input<string[]>(['Eletrica', 'Hidraulica', 'Pintura', 'Jardinagem']);
  servicesCount = computed(() => this.services().length);

  briefcaseIcon = faBriefcase;
  socialLinks = SOCIAL_LINKS;
}
