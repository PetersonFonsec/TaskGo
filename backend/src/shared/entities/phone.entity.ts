import { ValueObject } from "./value-object.interface";

export class Phone implements ValueObject<Phone> {
  private readonly value: string;

  constructor(value: string) {
    if (!Phone.isValid(value)) {
      throw new Error('Invalid phone number');
    }
    this.value = value;
  }

  static isValid(value: string): boolean {
    // Exemplo simples de validação: apenas dígitos, tamanho entre 10 e 13
    return /^\d{10,13}$/.test(value);
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
    return this.value;
  }
}
