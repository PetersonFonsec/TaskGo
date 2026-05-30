import { RouterLink } from '@angular/router';
import { Component } from '@angular/core';

import {
  faUser,
  faLocationDot,
  faPiggyBank
} from '@fortawesome/free-solid-svg-icons';

import { CardMenu } from '@shared/components/ui/card-menu/card-menu';

@Component({
  selector: 'app-home',
  imports: [CardMenu, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  itens = [
    {
      title: 'Seu Perfil',
      subtitle: 'Centralizado informações sobre o seu perfil. ',
      icon: faUser,
      link: '../history'
    },
    {
      title: 'Endereços',
      subtitle: 'Gerencie seus endereços.',
      icon: faLocationDot,
      link: '../addresses'
    },
    {
      title: 'Contas e Pagamentos',
      subtitle: 'Gerencie suas contas e pagamentos.',
      icon: faPiggyBank,
      link: '../payments'
    },
    {
      title: 'Contatos e informações pessoais',
      subtitle: 'Adicione suas redes sociais e contatos',
      icon: faPiggyBank,
      link: '../contacts'
    }
  ]
}
