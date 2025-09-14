import { UserType } from "@prisma/client";
import { Cpf } from "./cpf.entity";
import { Email } from "./email.entity";
import { Phone } from "./phone.entity";
import { ValueObject } from "./value-object.interface";
import { UserException } from "@shared/exceptions/user.exception";
import { CustomException } from "@shared/exceptions/custom.exception";

export class User implements ValueObject<User> {
  id: bigint;
  name: string;
  email: Email;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  photoUrl?: string;
  phone?: Phone;
  cpf: Cpf;
  type: UserType;

  constructor(init?: Partial<User>) {
    this.validateFields(init);
  }

  equals(other: User): boolean {
    if (!other) return false;
    return this.id === other.id;
  }

  validateFields(init?: Partial<User>): void {
    const fieldsRequiredValidations = ['email', 'phone', 'cpf'];

    for (const field in init) {
      const value = init[field];

      if (!fieldsRequiredValidations.includes(field)) {
        this[field] = value;
      }

      switch (field) {
        case 'email':
          this.email = new Email(value);
          break;
        case 'phone':
          this.phone = new Phone(value);
          break;
        case 'cpf':
          this.cpf = new Cpf(value);
          break;
      }
    }
  }

  validate(): boolean {
    try {
      return !!this.email?.validate() && !!this.phone?.validate() && !!this.cpf?.validate();
    } catch (error: CustomException | any) {
      throw new UserException();
    }
  }

  getValue(): User {
    return this;
  }

  toString(): string {
    return `User: ${this.id}, Name: ${this.name}, Email: ${this.email?.toString()}`;
  }
}
