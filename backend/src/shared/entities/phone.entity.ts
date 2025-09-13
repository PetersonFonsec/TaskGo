import { PhoneException } from "@shared/exceptions/phone.exception";
import { ValueObject } from "./value-object.interface";

export class Phone implements ValueObject<Phone> {
  private readonly value: string;

  constructor(value: string) {
    if (!Phone.isValid(value)) throw new PhoneException();
    this.value = value;
  }

  static removeMask(value: string): string {
    return value.replace(/\D/g, '').replace(' ', '');
  }

  static isValid(value: string): boolean {
    const unmasked = Phone.removeMask(value);
    return /^\d{10,13}$/.test(unmasked);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Phone): boolean {
    if (!other) return false;
    return this.value === other.value;
  }

  validate(): boolean {
    return Phone.isValid(this.value);
  }

  getValue(): string {
    return Phone.removeMask(this.value);
  }
}
