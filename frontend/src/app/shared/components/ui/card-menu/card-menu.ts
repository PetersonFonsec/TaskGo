import { Component, input } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPerson } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-card-menu',
  imports: [FontAwesomeModule],
  templateUrl: './card-menu.html',
  styleUrl: './card-menu.scss',
})
export class CardMenu {
  subtitle = input<string>('Centralizado informações sobre o seu perfil. ');
  title = input<string>('Seu Perfil');
  icon = input<any>(faPerson);
}
