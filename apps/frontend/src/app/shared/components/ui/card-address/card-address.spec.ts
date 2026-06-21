import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CardAddress } from './card-address';

describe('CardAddress', () => {
  let component: CardAddress;
  let fixture: ComponentFixture<CardAddress>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardAddress]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CardAddress);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
