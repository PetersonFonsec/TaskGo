import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Roles } from '@shared/enums/roles.enum';
import { Theme } from '@shared/service/theme/theme';
import { UserStorage } from '@shared/service/users/user-storage';
import { RegisterUser } from '../services/register-user/register-user';
import { Register } from './register';

type Steps = { profile: boolean; contact: boolean; address: boolean; category: boolean; service: boolean };

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let element: HTMLElement;
  let completeSteps: ReturnType<typeof signal<Steps>>;
  let register: jasmine.Spy<() => Observable<unknown>>;

  function setup(steps: Partial<Steps> = {}, response: () => Observable<unknown> = () => of({ user: {} })) {
    completeSteps = signal({ profile: false, contact: false, address: false, category: false, service: false, ...steps });
    register = jasmine.createSpy('register').and.callFake(response);
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideRouter([]), { provide: RegisterUser, useValue: { completeSteps, register } }],
    });
    TestBed.inject(Theme).setTheme(Roles.CUSTOMER);
    TestBed.inject(UserStorage).type.set(Roles.CUSTOMER);
    fixture = TestBed.createComponent(Register);
    element = fixture.nativeElement;
    fixture.detectChanges();
  }

  const radio = (id: string) => element.querySelector<HTMLInputElement>(`#${id} input[type="radio"]`)!;
  const stepIds = () => Array.from(element.querySelectorAll('.register__step')).map((step) => step.id);
  const badges = () => Array.from(element.querySelectorAll('.register__step tg-badge')).map((b) => b.textContent?.trim());
  const submit = () => element.querySelector<HTMLButtonElement>('#register-submit')!;

  afterEach(() => TestBed.inject(Theme).setTheme(Roles.CUSTOMER));

  it('offers Cliente and Profissional as choice cards, with Cliente selected', () => {
    setup();
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Criar conta');
    expect(element.querySelectorAll('label[tgCard] input[type="radio"]').length).toBe(2);
    expect(radio('account-type-customer').checked).toBeTrue();
    expect(radio('account-type-provider').checked).toBeFalse();
  });

  it('switches to Profissional: provider theme and the service step', () => {
    setup();
    expect(stepIds()).toEqual(['profile-step', 'contact-step', 'address-step']);
    radio('account-type-provider').click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe(Roles.PROVIDER);
    expect(stepIds()).toEqual(['profile-step', 'contact-step', 'address-step', 'category-step']);
  });

  it('shows each step as a link with its status', () => {
    setup({ profile: true });
    expect(badges()).toEqual(['Feito', 'Pendente', 'Pendente']);
    expect(element.querySelector('#profile-step')?.getAttribute('href')).toBe('/authenticate/profile');
    expect(element.querySelector('.register__progress')?.textContent?.trim()).toBe('1 de 3');
  });

  it('keeps "Criar sua conta" disabled, with the reason, until every step is done', () => {
    setup({ profile: true, contact: true });
    expect(submit().disabled).toBeTrue();
    expect(element.querySelector('#register-hint')?.textContent).toContain('Complete todos os passos');
    completeSteps.update((steps) => ({ ...steps, address: true }));
    fixture.detectChanges();
    expect(submit().disabled).toBeFalse();
    expect(element.querySelector('#register-hint')).toBeNull();
  });

  it('registers once while the request runs and then opens the success modal', () => {
    const pending = new Subject<unknown>();
    setup({ profile: true, contact: true, address: true }, () => pending);
    submit().click();
    submit().click();
    fixture.detectChanges();
    expect(register).toHaveBeenCalledTimes(1);
    expect(submit().getAttribute('aria-busy')).toBe('true');
    pending.next({ user: {} });
    pending.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.showModal()).toBeTrue();
  });

  it('shows the API error in a danger alert', () => {
    setup({ profile: true, contact: true, address: true }, () =>
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: ['Email já cadastrado'] } })),
    );
    submit().click();
    fixture.detectChanges();
    expect(element.querySelector('tg-alert')?.textContent).toContain('Email já cadastrado');
  });
});
