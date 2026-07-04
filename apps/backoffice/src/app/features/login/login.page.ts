import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AdminAuthService } from '@app/core/auth/admin-auth.service';

@Component({
  selector: 'bo-login-page',
  imports: [ReactiveFormsModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  readonly #auth = inject(AdminAuthService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);

  @ViewChild('formError') private readonly formError?: ElementRef<HTMLElement>;

  protected readonly loading = signal(false);
  protected readonly apiError = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  protected submit(): void {
    this.apiError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.#focusError();
      return;
    }

    this.loading.set(true);
    this.form.disable();

    this.#auth
      .login(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.form.enable();
        })
      )
      .subscribe({
        next: () => {
          const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl') || '/';
          this.#router.navigateByUrl(returnUrl);
        },
        error: () => {
          this.apiError.set('Administrative credentials were not accepted.');
          this.#focusError();
        }
      });
  }

  #focusError(): void {
    queueMicrotask(() => this.formError?.nativeElement.focus());
  }
}
