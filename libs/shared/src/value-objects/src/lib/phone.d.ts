import { ValueObject } from "./value-object.interface";
export declare class Phone implements ValueObject<Phone> {
    private readonly value;
    constructor(value: string);
    static removeMask(value: string): string;
    static isValid(value: string): boolean;
    toString(): string;
    equals(other: Phone): boolean;
    validate(): boolean;
    getValue(): string;
}
