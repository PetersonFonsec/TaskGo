import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BasicFormPage } from './basic-form.page';

describe('BasicFormPage', () => {
  let component: BasicFormPage;
  let fixture: ComponentFixture<BasicFormPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BasicFormPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
