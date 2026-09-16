import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { User } from '@shared/service/users/user';
import { TokenService } from '@shared/service/token/token.service';
import { Router } from '@angular/router';
import { Profile } from './profile';

describe('Profile database header', () => {
  const user = {
    id: '14',
    name: 'Maria Oliveira',
    photoUrl: '/uploads/maria.jpg',
    bio: 'Minha biografia',
  };
  let getUser: jasmine.Spy;

  beforeEach(() => {
    getUser = jasmine.createSpy('getUser').and.returnValue(of(user));
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: TokenService, useValue: { clearToken: jasmine.createSpy('clearToken') } },
        { provide: User, useValue: { getUser } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ userId: '14' })) },
        },
      ],
    });
  });

  it('loads the route user and renders the returned identity without sample specialties', () => {
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    expect(getUser).toHaveBeenCalledWith('14');
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(user.name);
    expect(fixture.nativeElement.querySelector('app-avatar img').getAttribute('src')).toBe(
      user.photoUrl,
    );
    expect(fixture.nativeElement.textContent).toContain(user.bio);
    expect(fixture.nativeElement.textContent).not.toContain('João da Silva');
    expect(fixture.nativeElement.textContent).not.toContain('Eletrica');
  });

  it('does not substitute another person when the photo is absent', () => {
    getUser.and.returnValue(of({ ...user, photoUrl: null }));
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-avatar img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Sem foto');
  });

  it('shows a loading error without a fictional identity', () => {
    getUser.and.returnValue(throwError(() => new Error('unavailable')));
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Não foi possível carregar seu perfil',
    );
    expect(fixture.nativeElement.querySelector('app-profile-header-info')).toBeNull();
  });
  it('presents an illustrated expired session and lets the user sign in again', () => {
    getUser.and.returnValue(
      throwError(() => ({ status: 401, error: { message: 'Authentication token required' } })),
    );
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sua sessão expirou');
    expect(fixture.nativeElement.textContent).not.toContain('Authentication token required');
    expect(fixture.nativeElement.querySelector('.profile-error_illustration')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    expect(TestBed.inject(TokenService).clearToken).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/authenticate/login');
  });

  it('retries a failed request and displays the recovered profile', () => {
    getUser.and.returnValues(
      throwError(() => ({ status: 500 })),
      of(user),
    );
    const fixture = TestBed.createComponent(Profile);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(getUser).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.profile-error')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(user.name);
  });
});
