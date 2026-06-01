import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { LiveAnnouncer } from '@angular/cdk/a11y';

import { SingleUser } from './single-user';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';
import { User } from '@shared/service/users/user';

describe('SingleUser', () => {
  let component: SingleUser;
  let fixture: ComponentFixture<SingleUser>;
  let providerMock: any;
  let userLoggedMock: any;
  let liveAnnouncerMock: any;

  beforeEach(async () => {
    providerMock = {
      getProvider: jasmine.createSpy('getProvider').and.returnValue(of({
        id: '1',
        user: { name: 'Test Provider' },
        services: [{ id: 's1' }]
      })),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine.createSpy('listFavorites').and.returnValue(of({ items: [] }))
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({ user: { id: 'client-1' } })
    };

    liveAnnouncerMock = {
      announce: jasmine.createSpy('announce')
    };

    await TestBed.configureTestingModule({
      imports: [SingleUser],
      providers: [
        { provide: ActivatedRoute, useValue: { params: of({ userId: '1' }) } },
        { provide: Router, useValue: {} },
        { provide: Provider, useValue: providerMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
        { provide: User, useValue: { getProvider: providerMock.getProvider } },
        { provide: LiveAnnouncer, useValue: liveAnnouncerMock }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SingleUser);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call addFavorite when the favorite toggle is activated', () => {
    component.favoriteState.set(false);
    component.toggleFavorite();

    expect(providerMock.addFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(liveAnnouncerMock.announce).toHaveBeenCalledWith('Profissional adicionado aos favoritos.');
    expect(component.favoriteState()).toBeTrue();
  });
});
