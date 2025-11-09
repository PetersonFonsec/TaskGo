import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardThumb } from './card-thumb';

describe('CardThumb', () => {
  let component: CardThumb;
  let fixture: ComponentFixture<CardThumb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardThumb]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardThumb);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
