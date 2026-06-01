import { ValueObject } from "./../../../shared/entities/value-object.interface";
import { Address as IAddress } from "./../../../shared/interfaces/address.interface";
export class Address implements ValueObject<IAddress> {
  private label: string;
  private cep: string;
  private street: string;
  private number: string;
  private state: string;
  private city: string;
  private lat: number;
  private lng: number;
  private complement?: string;
  private isDefault?: boolean;
  private userId?: bigint;

  constructor(init?: Partial<IAddress & { isDefault?: boolean; userId?: bigint }>) {
    Object.assign(this, init);
    this.validate();
  }

  equals(other: IAddress): boolean {
    if (!other) return false;
    return (
      this.street === other.street &&
      this.number === other.number &&
      this.city === other.city &&
      this.state === other.state &&
      this.cep === other.cep
    );
  }

  toString(): string {
    return `${this.street}, ${this.number}, ${this.city}, ${this.state}, ${this.cep}`;
  }

  validate(): boolean {
    return (
      !!this.label &&
      !!this.street &&
      !!this.number &&
      !!this.city &&
      !!this.state &&
      !!this.cep
    );
  }

  getValue() {
    return {
      label: this.label,
      street: this.street,
      number: this.number,
      city: this.city,
      state: this.state,
      cep: this.cep,
      lat: this.lat,
      lng: this.lng,
      complement: this.complement,
      isDefault: this.isDefault ?? false,
      userId: this.userId,
    };
  }
}
