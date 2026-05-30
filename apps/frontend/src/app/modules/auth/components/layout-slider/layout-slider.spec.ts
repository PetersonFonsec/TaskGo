import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutSlider } from './layout-slider';

describe('LayoutSlider', () => {
  let component: LayoutSlider;
  let fixture: ComponentFixture<LayoutSlider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutSlider]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LayoutSlider);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
