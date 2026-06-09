import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsideListItem } from './aside-list-item';

describe('AsideListItem', () => {
  let component: AsideListItem;
  let fixture: ComponentFixture<AsideListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsideListItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsideListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
