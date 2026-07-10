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
      getUser: jasmine.createSpy('getUser').and.returnValue(of({
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
      } satisfies PublicUserProfile)),
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
              paramMap: {
                get: (key: string) => (key === 'userId' ? '1' : null),
              },
            },
          },
        },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

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
    expect(component.user() as any).not.toEqual(jasmine.objectContaining({
      orders: jasmine.anything(),
      reviews: jasmine.anything(),
      provider: jasmine.anything(),
    }));
  });

  it('navigates to edit when edit button is clicked', () => {
    const button = fixture.nativeElement.querySelector('[data-cy="edit-profile"]');
    button.click();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['profile/edit'], {
      relativeTo: jasmine.anything(),
    });
  });
});
