import { ComponentFixture, TestBed } from '@angular/core/testing';
import { input, output } from '@angular/core';

import { CardDetail } from './card-detail';

describe('CardDetail', () => {
  let component: CardDetail;
  let fixture: ComponentFixture<CardDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the favorite toggle and call the configured callback', () => {
    const toggleSpy = jasmine.createSpy('toggle');
    component.title = input('Test');
    component.showFavorite = input(true);
    component.isFavorite = input(true);
    component.favoriteLoading = input(false);
    component.favoriteError = input('');
    const favoriteToggle = output<void>();
    spyOn(favoriteToggle, 'emit');
    component.favoriteToggle = favoriteToggle;

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.card-detail_favorite');
    expect(button).withContext('favorite button exists').not.toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toContain('Remover dos favoritos');

    button.click();
    expect(toggleSpy).toHaveBeenCalled();
  });

  it('should keep the favorite button keyboard accessible and focusable', () => {
    component.showFavorite = input(true);
    component.isFavorite = input(false);
    component.favoriteLoading = input(false);
    component.favoriteError = input('');
    const favoriteToggle = output<void>();
    component.favoriteToggle = favoriteToggle;

    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.card-detail_favorite');
    expect(button).withContext('favorite button exists').not.toBeNull();
    expect(button.getAttribute('type')).toBe('button');
    expect(button.tabIndex).toBe(0);
  });
});
