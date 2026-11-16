import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { Profile } from './profile';

describe('Profile (register step 1)', () => {
  let fixture: ComponentFixture<Profile>;
  let element: HTMLElement;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Profile], providers: [provideRouter([])] });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Profile);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => element.remove());

  const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;
  const errors = () => Array.from(element.querySelectorAll('.tg-field__error')).map((e) => e.textContent?.trim());
  async function type(id: string, value: string) {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }
  function submit() {
    element.querySelector<HTMLButtonElement>('#profile-submit')!.click();
    fixture.detectChanges();
  }
  async function fillValid() {
    await type('name-input', 'Ana Souza');
    await type('email-input', 'ana@email.com');
    await type('phone-input', '11912345678');
    await type('documentNumber-input', '12345678909');
    await type('password-input', 'segredo1234');
    await type('confirmPassword-input', 'segredo1234');
  }

  it('has the step heading and a way back to Criar conta', () => {
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Seu perfil');
    expect(element.querySelector('.auth__back')?.getAttribute('href')).toBe('/authenticate/register');
    expect(element.querySelector('.tg-field__hint')?.textContent?.trim()).toBe('Pelo menos 10 caracteres.');
  });

  it('shows every error on submit and focuses the first invalid field', () => {
    submit();
    expect(errors()).toEqual([
      'Informe seu nome completo.',
      'Informe seu e-mail.',
      'Informe o celular com DDD.',
      'Informe seu CPF.',
      'Crie uma senha.',
      'Repita a senha.',
    ]);
    expect(document.activeElement).toBe(input('name-input'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('checks the CPF digits, the password length and the confirmation', async () => {
    await fillValid();
    await type('documentNumber-input', '12345678900');
    await type('password-input', 'curta');
    submit();
    expect(errors()).toEqual(['Confira o CPF: os dígitos não batem.', 'Use pelo menos 10 caracteres.', 'As senhas não são iguais.']);
    expect(document.activeElement).toBe(input('documentNumber-input'));
  });

  it('saves the draft (digits only) and goes back to Criar conta', async () => {
    await fillValid();
    submit();
    const user = TestBed.inject(RegisterUser).user();
    expect(user.name).toBe('Ana Souza');
    expect(user.phone).toBe('11912345678');
    expect(user.cpf).toBe('12345678909');
    expect(user.password).toBe('segredo1234');
    expect(TestBed.inject(RegisterUser).completeSteps().profile).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/authenticate/register');
  });

  it('comes back filled from the draft', async () => {
    await fillValid();
    submit();
    element.remove();
    const again = TestBed.createComponent(Profile);
    document.body.appendChild(again.nativeElement);
    again.detectChanges();
    await again.whenStable();
    // O ngModel escreve o valor depois do primeiro ciclo; a máscara formata no seguinte.
    again.detectChanges();
    await again.whenStable();
    const value = (id: string) => again.nativeElement.querySelector(`#${id}`).value;
    expect(value('name-input')).toBe('Ana Souza');
    expect(value('documentNumber-input')).toBe('123.456.789-09');
    expect(value('confirmPassword-input')).toBe('segredo1234');
    again.nativeElement.remove();
  });
});
