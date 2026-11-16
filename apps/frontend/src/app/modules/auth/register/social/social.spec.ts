import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RegisterUser } from '@modules/auth/services/register-user/register-user';
import { Social } from './social';

describe('Social (register step 2)', () => {
  let fixture: ComponentFixture<Social>;
  let element: HTMLElement;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Social], providers: [provideRouter([])] });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(Social);
    element = fixture.nativeElement;
    document.body.appendChild(element);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => element.remove());

  const input = (id: string) => element.querySelector<HTMLInputElement>(`#${id}`)!;
  async function type(id: string, value: string) {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }
  const submit = () => {
    element.querySelector<HTMLButtonElement>('#social-submit')!.click();
    fixture.detectChanges();
  };

  it('marks every field as optional and saves an empty step', () => {
    expect(element.querySelectorAll('.tg-field__optional').length).toBe(4);
    submit();
    expect(TestBed.inject(RegisterUser).completeSteps().contact).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/authenticate/register');
  });

  it('asks for a complete WhatsApp when one is typed', async () => {
    await type('whatsapp-input', '1191');
    submit();
    expect(element.querySelector('.tg-field__error')?.textContent).toContain('com DDD');
    expect(document.activeElement).toBe(input('whatsapp-input'));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the @ as the prefix and saves the handle with it', async () => {
    await type('instagram-input', '@ana.servicos');
    expect(input('instagram-input').value).toBe('ana.servicos');
    await type('linkedin-input', ' linkedin.com/in/ana ');
    submit();
    const social = TestBed.inject(RegisterUser).user().social;
    expect(social.instagram).toBe('@ana.servicos');
    expect(social.linkdin).toBe('linkedin.com/in/ana');
  });
});
