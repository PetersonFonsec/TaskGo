import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeConduct } from './code-conduct';

describe('CodeConduct', () => {
  let component: CodeConduct;
  let fixture: ComponentFixture<CodeConduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeConduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeConduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
