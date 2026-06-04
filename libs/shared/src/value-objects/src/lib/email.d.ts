import { ValueObject } from "./value-object.interface";
export declare class Email implements ValueObject<Email> {
    private readonly value;
    constructor(email: string);
    static isValid(email: string): boolean;
    toString(): string;
    getValue(): string;
    equals(other: Email): boolean;
    validate(): boolean;
}
