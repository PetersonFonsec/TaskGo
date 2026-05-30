import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsLines } from './steps-lines';

describe('StepsLines', () => {
  let component: StepsLines;
  let fixture: ComponentFixture<StepsLines>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsLines]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StepsLines);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
