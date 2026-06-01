import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Search } from './search';
import { Provider } from '@shared/service/provider/provider';
import { UserLoggedService } from '@shared/service/user-logged/user-logged.service';

describe('Search', () => {
  let component: Search;
  let fixture: ComponentFixture<Search>;
  let providerMock: any;
  let userLoggedMock: any;
  let routerMock: any;

  beforeEach(async () => {
    providerMock = {
      findProvidersByCategorySlug: jasmine.createSpy('findProvidersByCategorySlug').and.returnValue(of([{ id: '1', user: { name: 'Test Provider', phone: '123' }, services: [] }])),
      addFavorite: jasmine.createSpy('addFavorite').and.returnValue(of(null)),
      removeFavorite: jasmine.createSpy('removeFavorite').and.returnValue(of(null)),
      listFavorites: jasmine.createSpy('listFavorites').and.returnValue(of({ items: [{ providerId: '1' }] })),
    };

    userLoggedMock = {
      user: jasmine.createSpy('user').and.returnValue({ user: { id: 'client-1' } }),
    };

    routerMock = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [Search],
      providers: [
        { provide: Provider, useValue: providerMock },
        { provide: UserLoggedService, useValue: userLoggedMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { queryParams: of({ categoria: 'test' }) } }
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Search);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load favorites for the signed-in user', () => {
    fixture.detectChanges();

    expect(providerMock.listFavorites).toHaveBeenCalledWith('client-1');
    expect(component.isFavorite('1')).toBeTrue();
  });

  it('should pass onlyFavorites when the toggle is enabled', () => {
    fixture.detectChanges();

    component.toggleOnlyFavorites(true);

    expect(routerMock.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ onlyFavorites: 'true' })
    }));
  });

  it('should persist onlyFavorites preference when toggled', () => {
    spyOn(window.localStorage, 'setItem');
    fixture.detectChanges();

    component.toggleOnlyFavorites(true);

    expect(window.localStorage.setItem).toHaveBeenCalledWith('search.onlyFavorites.client-1', 'true');
  });

  it('should restore persisted onlyFavorites preference on init', () => {
    spyOn(window.localStorage, 'getItem').and.returnValue('true');
    fixture.detectChanges();

    expect(component.onlyFavorites()).toBeTrue();
    expect(providerMock.findProvidersByCategorySlug).toHaveBeenCalledWith('test', jasmine.objectContaining({ onlyFavorites: true }));
  });

  it('should add a favorite when toggled on', () => {
    component.favorites.set({});

    component.toggleFavorite('1');

    expect(providerMock.addFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(component.isFavorite('1')).toBeTrue();
    expect(component.isFavoriteLoading('1')).toBeFalse();
  });

  it('should remove a favorite when toggled off', () => {
    component.favorites.set({ '1': true });

    component.toggleFavorite('1');

    expect(providerMock.removeFavorite).toHaveBeenCalledWith('client-1', '1');
    expect(component.isFavorite('1')).toBeFalse();
    expect(component.isFavoriteLoading('1')).toBeFalse();
  });

  it('should show an error message when favorite update fails', () => {
    providerMock.addFavorite.and.returnValue(throwError(() => new HttpErrorResponse({ error: { message: 'fail' } })));
    component.favorites.set({});

    component.toggleFavorite('1');

    expect(component.favoriteErrorMessage('1')).toBe('fail');
    expect(component.isFavorite('1')).toBeFalse();
    expect(component.isFavoriteLoading('1')).toBeFalse();
  });
});
