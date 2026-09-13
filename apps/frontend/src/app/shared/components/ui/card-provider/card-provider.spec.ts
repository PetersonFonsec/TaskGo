import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardProvider } from './card-provider';

describe('CardProvider', () => {
  let component: CardProvider;
  let fixture: ComponentFixture<CardProvider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardProvider],
    }).compileComponents();

    fixture = TestBed.createComponent(CardProvider);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('params', {
      title: 'Ana',
      thumb: '',
      verified: false,
      favorite: false,
      price: 120,
    });
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
