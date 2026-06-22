import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeIcon } from './badge-icon';

describe('BadgeIcon', () => {
  let component: BadgeIcon;
  let fixture: ComponentFixture<BadgeIcon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeIcon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BadgeIcon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
