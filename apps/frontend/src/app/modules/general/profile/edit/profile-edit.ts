import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIf } from '@angular/common';
import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { User } from '@shared/service/users/user';
import { UserResponse } from '@shared/service/users/user.model';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [FormsModule, NgIf, InputTextComponent],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit implements OnInit {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #userService = inject(User);

  user = signal<UserResponse | null>(null);
  error = signal('');
  success = signal('');
  loading = signal(true);

  nameValue = '';
  emailValue = '';
  phoneValue = '';

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
        this.nameValue = response.name;
        this.emailValue = response.email;
        this.phoneValue = response.phone;
        this.loading.set(false);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Erro ao carregar o perfil');
        this.loading.set(false);
      },
    });
  }

  validate() {
    const email = this.emailValue;
    const phone = this.phoneValue;
    const errors: string[] = [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Email inválido');
    }

    if (!phone || !/^\+?[0-9]{8,15}$/.test(phone)) {
      errors.push('Telefone inválido');
    }

    return errors;
  }

  save(form: NgForm) {
    const userId = this.#route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.error.set('Usuário não encontrado');
      return;
    }

    const errors = this.validate();
    if (errors.length > 0) {
      this.error.set(errors.join('. '));
      this.success.set('');
      return;
    }

    this.error.set('');
    this.success.set('');

    this.#userService.updateUser(userId, {
      name: this.nameValue,
      email: this.emailValue,
      phone: this.phoneValue,
    }).subscribe({
      next: () => {
        this.success.set('Perfil salvo com sucesso');
        this.error.set('');
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Erro ao salvar o perfil');
        this.success.set('');
      },
    });
  }

  cancel() {
    this.#router.navigate(['../home'], { relativeTo: this.#route });
  }
}
