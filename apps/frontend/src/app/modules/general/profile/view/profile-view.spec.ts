import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import type { PublicUserProfile } from '@taskgo/shared';
import { ProfileView } from './profile-view';
import { User } from '@shared/service/users/user';
import { RouterTestingModule } from '@angular/router/testing';

describe('ProfileView', () => {
  let fixture: ComponentFixture<ProfileView>;
  let component: ProfileView;
  let mockUserService: Partial<User>;
  let mockRouter: Partial<Router>;

  beforeEach(async () => {
    mockUserService = {
      getUser: jasmine.createSpy('getUser').and.returnValue(
        of({
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
          phone: '+5511999999999',
          cpf: '12345678900',
          type: 'CLIENTE',
          photoUrl: '',
          addresses: [
            {
              id: '1',
              label: 'Home',
              street: 'Rua Exemplo',
              city: 'Sao Paulo',
              state: 'SP',
              postalCode: '01000-000',
              country: 'BR',
              isPrimary: true,
            },
          ],
        } satisfies PublicUserProfile),
      ),
    };

    mockRouter = {
      navigate: jasmine.createSpy('navigate'),
    };

    await TestBed.configureTestingModule({
      imports: [ProfileView, RouterTestingModule],
      providers: [
        { provide: User, useValue: mockUserService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              pathFromRoot: [
                { paramMap: { get: (key: string) => (key === 'userId' ? '1' : null) } },
              ],
              paramMap: {
                get: (key: string) => (key === 'userId' ? '1' : null),
              },
            },
          },
        },
      ],
    }).compileComponents();

    mockRouter = TestBed.inject(Router);
    spyOn(TestBed.inject(Router), 'navigate');
    fixture = TestBed.createComponent(ProfileView);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders user fields and addresses', () => {
    const html = fixture.nativeElement.textContent;
    expect(html).toContain('Test User');
    expect(html).toContain('test@example.com');
    expect(html).toContain('Rua Exemplo');
    expect(component.user() as any).not.toEqual(
      jasmine.objectContaining({
        orders: jasmine.anything(),
        reviews: jasmine.anything(),
        provider: jasmine.anything(),
      }),
    );
  });

  it('navigates to edit when edit button is clicked', () => {
    const button = fixture.nativeElement.querySelector('[data-cy="edit-profile"]');
    button.click();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../edit'], {
      relativeTo: jasmine.anything(),
    });
  });
  it('shows customer shortcuts and incomplete photo action', () => {
    const html = fixture.nativeElement;
    expect(html.textContent).toContain('67%');
    expect(html.querySelector('a[href="/customer/favorites"]')).toBeTruthy();
    expect(html.textContent).toContain('Adicionar foto');
    expect(html.textContent).not.toContain('Ver meu perfil público');
  });

  it('shows provider actions for both role formats', () => {
    for (const type of ['PRESTADOR', 'PROVIDER'] as const) {
      component.user.update((user) => ({ ...user!, type }));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('a[href="/provider/services"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('a[href="/provider/profile/1"]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('a[href="/customer/favorites"]')).toBeNull();
    }
  });

  it('prefers the primary address and handles an empty profile', () => {
    const first = component.user()!.addresses![0];
    component.user.update((user) => ({
      ...user!,
      addresses: [
        { ...first, isPrimary: false },
        { ...first, street: 'Principal', isDefault: true },
      ],
    }));
    expect(component.primaryAddress()?.street).toBe('Principal');
    component.user.update((user) => ({ ...user!, name: '', email: '', phone: '', addresses: [] }));
    fixture.detectChanges();
    expect(component.completion()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Nenhum endereço cadastrado');
  });

  it('completes registration without claiming contact verification', () => {
    component.user.update((user) => ({
      ...user!,
      photoUrl: 'https://example.com/photo.jpg',
      emailVerified: false,
    }));
    fixture.detectChanges();
    expect(component.completion()).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('E-mail pendente de verificação');
  });
});
