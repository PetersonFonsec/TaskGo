import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step } from './step';

describe('Step', () => {
  let component: Step;
  let fixture: ComponentFixture<Step>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Step);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
