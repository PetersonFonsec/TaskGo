import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AfterViewInit, Component, ElementRef, computed, forwardRef, input, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

export enum InputTextTypes {
  password = "password",
  text = "text"
}

@Component({
  selector: 'app-input-text',
  standalone: true,
  imports: [NgClass, NgxMaskDirective],
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
export class InputTextComponent implements ControlValueAccessor, AfterViewInit {
  readonly placeholder = input('');
  readonly disabled = input(false);
  readonly success = input(false);
  readonly error = input(false);
  readonly label = input('');
  readonly id = input("", { transform: (value: string /*T:VAE*/) => `${value}-input` });
  readonly type = input("text");
  readonly mask = input("");
  readonly autofocus = input(false);
  readonly required = input(false);
  readonly describeBy = input("");
  protected readonly value = signal('');
  protected readonly controlDisabled = signal(false);
  protected readonly isDisabled = computed(() => this.disabled() || this.controlDisabled());

  readonly inputHTML = viewChild.required<ElementRef>("inputHTML");

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  ngAfterViewInit() {
    if (!this.autofocus()) return;

    this.inputHTML().nativeElement.focus();
  }


  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | null | undefined): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.controlDisabled.set(disabled);
  }
}
