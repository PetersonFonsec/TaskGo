import { Cpf } from "./cpf";
import { Email } from "./email";
import { Phone } from "./phone";
import { ValueObject } from "./value-object.interface";
export declare class User implements ValueObject<User> {
    id: bigint;
    name: string;
    email: Email;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    photoUrl?: string;
    phone?: Phone;
    cpf: Cpf;
    type: any;
    constructor(init?: Partial<User>);
    equals(other: User): boolean;
    validateFields(init?: Partial<User>): void;
    validate(): boolean;
    getValue(): User;
    toString(): string;
}
