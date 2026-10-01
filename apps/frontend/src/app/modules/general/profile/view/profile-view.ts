import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@shared/components/ui/button/button.component';
import { User } from '@shared/service/users/user';
import type { PublicAddressSummary, PublicUserProfile } from '@taskgo/shared';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [RouterLink, ButtonComponent],
  templateUrl: './profile-view.html',
  styleUrl: './profile-view.scss',
})
export class ProfileView implements OnInit {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #userService = inject(User);

  user = signal<PublicUserProfile | null>(null);
  error = signal('');
  loading = signal(true);

  isProvider = computed(() => ['PRESTADOR', 'PROVIDER'].includes(this.user()?.type ?? ''));
  isCustomer = computed(() => ['CLIENTE', 'CUSTOMER'].includes(this.user()?.type ?? ''));
  addressesLink = computed(() => ['/general', this.user()?.id ?? '', 'addresses']);
  primaryAddress = computed<PublicAddressSummary | undefined>(() => {
    const addresses = this.user()?.addresses ?? [];
    return addresses.find((address) => address.isPrimary || address.isDefault) ?? addresses[0];
  });
  checklist = computed(() => {
    const user = this.user();
    return [
      {
        label: 'Dados de contato',
        done: !!user?.name?.trim() && !!user?.email?.trim() && !!user?.phone?.trim(),
        action: 'Completar dados',
        link: ['/general', user?.id ?? '', 'profile', 'edit'],
      },
      {
        label: 'Foto de perfil',
        done: !!user?.photoUrl?.trim(),
        action: 'Adicionar foto',
        link: ['/general', user?.id ?? '', 'profile', 'edit'],
      },
      {
        label: 'Endereço cadastrado',
        done: !!user?.addresses?.length,
        action: 'Adicionar endereço',
        link: this.addressesLink(),
      },
    ];
  });
  completed = computed(() => this.checklist().filter((item) => item.done).length);
  completion = computed(() => Math.round((this.completed() / this.checklist().length) * 100));

  ngOnInit() {
    const userId = this.#route.snapshot.pathFromRoot
      .map((route) => route.paramMap.get('userId'))
      .find(Boolean);
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
    this.#router.navigate(['../edit'], { relativeTo: this.#route });
  }
}
