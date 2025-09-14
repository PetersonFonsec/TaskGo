import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WellcomePage } from './wellcome.page';

describe('WellcomePage', () => {
  let component: WellcomePage;
  let fixture: ComponentFixture<WellcomePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WellcomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
