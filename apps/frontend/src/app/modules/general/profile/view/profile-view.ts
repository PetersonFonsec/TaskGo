import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { User } from '@shared/service/users/user';
import { UserResponse } from '@shared/service/users/user.model';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView implements OnInit {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #userService = inject(User);

  user = signal<UserResponse | null>(null);
  error = signal('');
  loading = signal(true);

  ngOnInit() {
    const userId = this.#route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.error.set('Usuário não encontrado');
      this.loading.set(false);
      return;
    }

    this.#userService.getUser(userId).subscribe({
      next: (response) => {
        this.user.set(response);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Erro ao carregar o perfil');
        this.loading.set(false);
      },
    });
  }

  goToEdit() {
    this.#router.navigate(['profile/edit'], { relativeTo: this.#route });
  }
}
