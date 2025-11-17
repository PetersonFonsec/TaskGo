import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  #userLoggedService = inject(UserLoggedService);

  logout() {
    this.#userLoggedService.logout();
  }
}
