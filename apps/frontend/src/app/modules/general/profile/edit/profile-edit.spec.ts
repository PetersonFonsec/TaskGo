import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { ProfileEdit } from './profile-edit';
import { User } from '@shared/service/users/user';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let component: ProfileEdit;
  let mockUserService: Partial<User>;
  let mockRouter: Partial<Router>;

  beforeEach(async () => {
    mockUserService = {
      getUser: jest.fn().mockReturnValue(of({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        phone: '+5511999999999',
        type: 'client',
        photoUrl: '',
        addresses: [],
      })),
      updateUser: jest.fn().mockReturnValue(of({})),
    };

    mockRouter = {
      navigate: jest.fn(),
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

  it('shows validation error for invalid input', async () => {
    component.nameValue = 'User';
    component.emailValue = 'bad-email';
    component.phoneValue = '123';
    fixture.detectChanges();

    component.save({} as any);

    expect(component.error()).toContain('Email inválido');
  });

  it('calls updateUser on valid save', async () => {
    component.nameValue = 'User';
    component.emailValue = 'test@example.com';
    component.phoneValue = '+5511999999999';
    fixture.detectChanges();

    component.save({} as any);

    expect(mockUserService.updateUser).toHaveBeenCalledWith('1', {
      name: 'User',
      email: 'test@example.com',
      phone: '+5511999999999',
    });
    expect(component.success()).toBe('Perfil salvo com sucesso');
  });
});
