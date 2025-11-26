import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutSliderItem } from './layout-slider-item';

describe('LayoutSliderItem', () => {
  let component: LayoutSliderItem;
  let fixture: ComponentFixture<LayoutSliderItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutSliderItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutSliderItem);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
