import { Component, OnInit, forwardRef, input, output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons'

@Component({
  selector: 'app-step',
  imports: [FormsModule, FontAwesomeModule],
  templateUrl: './step.html',
  styleUrl: './step.scss',
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Step),
    },
  ]
})
export class Step implements OnInit, ControlValueAccessor {
  stepClicked = output<Step>();
  readonly value = input("");
  readonly name = input("");
  readonly id = input("");
  complete = input(false);
  val = '';
  icon = faCheck;

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

  ngOnInit(): void {
    this._value = this.complete();
  }

  onChange: any = () => { };

  onTouched: any = () => { };

  onBlur() { }
  
  onClick() {
    this.stepClicked.emit(this);
  }    

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
