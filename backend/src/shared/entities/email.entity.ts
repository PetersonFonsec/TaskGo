import { ValueObject } from "./value-object.interface";

export class Email implements ValueObject<Email> {
  private readonly value: string;

  constructor(email: string) {
    if (!Email.isValid(email)) {
      throw new Error('Invalid email address');
    }
    this.value = email;
  }

  static isValid(email: string): boolean {
    // Simple regex for demonstration purposes
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  toString(): string {
    return this.value;
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    if (!other) return false;
    return this.value === other.getValue();
  }

  validate(): boolean {
    return Email.isValid(this.value);
  }
}
