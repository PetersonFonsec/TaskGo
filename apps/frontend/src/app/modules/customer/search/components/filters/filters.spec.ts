import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ControlContainer,
  FormControl,
  FormGroup,
  FormGroupDirective,
  ReactiveFormsModule,
} from '@angular/forms';
import { Filters } from './filters';

@Component({
  imports: [ReactiveFormsModule, Filters],
  template: '<div [formGroup]="form"><app-filters /></div>',
})
class FilterHost {
  form = new FormGroup({
    filters: new FormGroup({
      cleaning: new FormControl(false),
      moving: new FormControl(false),
      assembly: new FormControl(false),
    }),
  });
}

describe('Filters', () => {
  let fixture: ComponentFixture<FilterHost>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FilterHost] })
      .overrideComponent(Filters, {
        add: { viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(FilterHost);
    fixture.detectChanges();
  });

  it('binds category controls to the parent filters form', () => {
    expect(fixture.debugElement.query(By.directive(Filters))).not.toBeNull();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input');
    checkbox.click();
    expect(fixture.componentInstance.form.controls.filters.controls.cleaning.value).toBeTrue();
  });
});
