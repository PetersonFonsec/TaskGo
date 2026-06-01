import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Favorites } from './favorites';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

describe('Favorites', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;
  let providerMock: any;
  let userLoggedMock: any;

  beforeEach(async () => {
    providerMock = {
      listFavorites: jasmine.createSpy('listFavorites').and.returnValue(of({ items: [{ provider: { id: '1', user: { name: 'Test Provider', phone: '123' } } }] })),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({ user: { id: 'client-1' } }),
    };

    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        { provide: Provider, useValue: providerMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load favorites for the signed-in user', () => {
    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1');
    expect(component.providers().length).toBe(1);
    expect(component.providers()[0].id).toBe('1');
  });

  it('should remove a favorite when toggled off', () => {
    component.providers.set([{ id: '1', user: { name: 'Test Provider', phone: '123' } }]);

    component.toggleFavorite('1');

    expect(providerMock.removeFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(component.providers().length).toBe(0);
    expect(component.isFavoriteLoading('1')).toBeFalse();
  });

  it('should show empty state when there are no favorites', () => {
    providerMock.listFavorites.and.returnValue(of({ items: [] }));
    const emptyFixture = TestBed.createComponent(Favorites);
    const emptyComponent = emptyFixture.componentInstance;

    emptyFixture.detectChanges();

    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1');
    expect(emptyComponent.providers().length).toBe(0);
    expect(emptyComponent.isLoading()).toBeFalse();
  });

  it('should show an error message when favorite removal fails', () => {
    providerMock.removeFavorite.and.returnValue(throwError(() => new HttpErrorResponse({ error: { message: 'fail' } })));
    component.providers.set([{ id: '1', user: { name: 'Test Provider', phone: '123' } }]);

    component.toggleFavorite('1');

    expect(component.favoriteErrorMessage('1')).toBe('fail');
    expect(component.isFavoriteLoading('1')).toBeFalse();
    expect(component.providers().length).toBe(1);
  });
});
