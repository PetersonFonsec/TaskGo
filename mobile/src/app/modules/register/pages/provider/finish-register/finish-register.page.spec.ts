import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinishRegisterPage } from './finish-register.page';

describe('FinishRegisterPage', () => {
  let component: FinishRegisterPage;
  let fixture: ComponentFixture<FinishRegisterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FinishRegisterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
