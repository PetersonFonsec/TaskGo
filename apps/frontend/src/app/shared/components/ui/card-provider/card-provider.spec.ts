import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardProvider } from './card-provider';

describe('CardProvider', () => {
  let component: CardProvider;
  let fixture: ComponentFixture<CardProvider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardProvider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardProvider);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
