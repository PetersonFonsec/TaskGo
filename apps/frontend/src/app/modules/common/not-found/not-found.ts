import { Component, signal } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRight,
  faCalendarDays,
  faHeadset,
  faHeart,
  faHome,
  faMagnifyingGlass,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { RouterLink } from '@angular/router';
import { Page } from '@shared/components/ui/page/page';

interface NotFoundShortcut {
  title: string;
  description: string;
  link: string;
  icon: IconDefinition;
}

@Component({
  selector: 'app-not-found',
  imports: [Page, RouterLink, FaIconComponent],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  readonly homeIcon = signal(faHome);
  readonly arrowIcon = signal(faArrowRight);
  readonly supportIcon = signal(faHeadset);

  readonly shortcuts = signal<NotFoundShortcut[]>([
    {
      title: 'Buscar serviços',
      description: 'Encontre o serviço que você precisa',
      link: '/customer/search',
      icon: faMagnifyingGlass,
    },
    {
      title: 'Meus agendamentos',
      description: 'Veja seus próximos agendamentos',
      link: '/customer',
      icon: faCalendarDays,
    },
    {
      title: 'Favoritos',
      description: 'Confira seus prestadores favoritos',
      link: '/customer/favorites',
      icon: faHeart,
    },
    {
      title: 'Para prestadores',
      description: 'Seja um prestador e cresça com o Proxi',
      link: '/provider',
      icon: faUser,
    },
  ]);
}
