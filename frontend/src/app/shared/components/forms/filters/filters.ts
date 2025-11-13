import { Component, OnInit, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-filters',
  imports: [FontAwesomeModule],
  templateUrl: './filters.html',
  styleUrl: './filters.scss',
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Filters),
    },
  ]
})
export class Filters implements OnInit, ControlValueAccessor {
  readonly value = input("");
  readonly name = input("");
  readonly id = input("");

  icon = faChevronDown;
  selected = input(true);
  mutiples = input(true);
  title = input('');

  val = '';

  get _value() {
    return this.val;
  }

  set _value(val: any) {
    if (val !== undefined && val !== null) {
      this.val = val;
      this.onChange(val);
      this.onTouched(val);
    }
  }

  toggle(event: any) {
    this._value = event
  }

  ngOnInit(): void { }

  onChange: any = () => { };

  onTouched: any = () => { };

  onBlur() { }

  writeValue(value: any) {
    this._value = value;
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }
}
