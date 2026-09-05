import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import type { PublicUserProfile } from '@taskgo/shared';
import { ProfileEdit } from './profile-edit';
import { User } from '@shared/service/users/user';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let component: ProfileEdit;
  let mockUserService: Partial<User>;
  let mockRouter: Partial<Router>;

  beforeEach(async () => {
    const profile: PublicUserProfile = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      phone: '+5511999999999',
      cpf: '12345678900',
      type: 'CLIENTE',
      photoUrl: '',
      addresses: [],
    };

    mockUserService = {
      getUser: jasmine.createSpy('getUser').and.returnValue(of(profile)),
      updateUser: jasmine.createSpy('updateUser').and.returnValue(of({
        ...profile,
        name: 'User',
      })),
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileEdit, RouterTestingModule],
      providers: [
        { provide: User, useValue: mockUserService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'userId' ? '1' : null),
              },
            },
          },
        },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows validation feedback for invalid input', async () => {
    setFormValues(fixture, ['User', 'bad-email', '123']);

    expect(fixture.nativeElement.textContent).toContain('Informe um email válido.');
    expect(mockUserService.updateUser).not.toHaveBeenCalled();
  });

  it('calls updateUser on valid save', async () => {
    setFormValues(fixture, ['User', 'test@example.com', '+5511999999999']);
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockUserService.updateUser).toHaveBeenCalledWith('1', {
      name: 'User',
      email: 'test@example.com',
      phone: '+5511999999999',
    });
    expect((mockUserService.updateUser as jasmine.Spy).calls.mostRecent().args[1] as any)
      .not.toEqual(jasmine.objectContaining({
        id: jasmine.anything(),
        passwordHash: jasmine.anything(),
        orders: jasmine.anything(),
      }));
    expect(fixture.nativeElement.textContent).toContain('Perfil salvo com sucesso');
  });
});

function setFormValues(fixture: ComponentFixture<ProfileEdit>, values: string[]): void {
  const inputs = Array.from(
    fixture.nativeElement.querySelectorAll('app-input-text input') as NodeListOf<HTMLInputElement>
  );

  inputs.forEach((input, index) => {
    input.value = values[index];
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  });
  fixture.detectChanges();
}
