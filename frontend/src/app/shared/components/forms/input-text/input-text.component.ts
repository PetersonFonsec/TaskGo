import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { AfterViewInit, Component, ElementRef, OnInit, forwardRef, input, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

export enum InputTextTypes {
  password = "password",
  text = "text"
}

@Component({
  selector: 'app-input-text',
  standalone: true,
  imports: [FormsModule, NgClass, NgxMaskDirective],
  templateUrl: './input-text.component.html',
  styleUrl: './input-text.component.scss',
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputTextComponent),
    },
    provideNgxMask()
  ]
})
export class InputTextComponent implements OnInit, ControlValueAccessor, AfterViewInit {
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly success = input(false);
  readonly error = input(false);
  readonly label = input('');
  readonly id = input("", { transform: (value: string /*T:VAE*/) => `${value}-input` });
  readonly type = input("text");
  readonly mask = input("");
  readonly autofocus = input(false);
  readonly describeBy = input("");
  val = '';

  readonly inputHTML = viewChild.required<ElementRef>("inputHTML");

  ngOnInit(): void { }

  onChange: any = () => { };

  onTouched: any = () => { };

  get value() {
    return this.val;
  }

  set value(val) {
    if (val !== undefined && val !== null) {
      this.val = val;
      this.onChange(val);
      this.onTouched(val);
    }
  }

  ngAfterViewInit() {
    if (!this.autofocus()) return;

    this.inputHTML().nativeElement.focus();
  }


  onBlur() { }

  writeValue(value: any) {
    this.value = value;
  }

  registerOnChange(fn: any) {
    this.onChange = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }
}
