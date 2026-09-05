import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { email, form, FormField, pattern, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { InputTextComponent } from '@shared/components/forms/input-text/input-text.component';
import { User } from '@shared/service/users/user';
import type { PublicUserProfile, UserProfileUpdateRequest } from '@taskgo/shared';

type EditableProfile = Required<Pick<UserProfileUpdateRequest, 'name' | 'email' | 'phone'>>;

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [FormField, InputTextComponent],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.scss',
})
export class ProfileEdit implements OnInit {
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #userService = inject(User);

  user = signal<PublicUserProfile | null>(null);
  error = signal('');
  success = signal('');
  loading = signal(true);

  protected readonly profileModel = signal<EditableProfile>({
    name: '',
    email: '',
    phone: ''
  });
  protected readonly profileForm = form(this.profileModel, (path) => {
    required(path.name, { message: 'Informe o nome.' });
    required(path.email, { message: 'Informe o email.' });
    email(path.email, { message: 'Informe um email válido.' });
    required(path.phone, { message: 'Informe o telefone.' });
    pattern(path.phone, /^\+?[0-9]{8,15}$/, { message: 'Informe um telefone válido.' });
  });

  async ngOnInit(): Promise<void> {
    const userId = this.#route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.error.set('Usuário não encontrado');
      this.loading.set(false);
      return;
    }

    try {
      const response = await firstValueFrom(this.#userService.getUser(userId));
      this.user.set(response);
      this.profileModel.set({
        name: response.name,
        email: response.email,
        phone: response.phone
      });
    } catch (error: unknown) {
      this.error.set(this.#errorMessage(error, 'Erro ao carregar o perfil'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const userId = this.#route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.error.set('Usuário não encontrado');
      return;
    }

    this.error.set('');
    this.success.set('');

    await submit(this.profileForm, async () => {
      try {
        const updatedUser = await firstValueFrom(
          this.#userService.updateUser(userId, this.profileModel())
        );
        this.user.set(updatedUser);
        this.success.set('Perfil salvo com sucesso');
      } catch (error: unknown) {
        this.error.set(this.#errorMessage(error, 'Erro ao salvar o perfil'));
        this.success.set('');
      }
    });
  }

  protected cancel(): void {
    void this.#router.navigate(['../home'], { relativeTo: this.#route });
  }

  #errorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const response = error.error;
      if (response && typeof response === 'object' && 'message' in response && typeof response.message === 'string') {
        return response.message;
      }
    }
    return fallback;
  }
}
