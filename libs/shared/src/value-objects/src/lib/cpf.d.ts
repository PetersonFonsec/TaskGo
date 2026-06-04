import { ValueObject } from "./value-object.interface";
export declare class Cpf implements ValueObject<Cpf> {
    private readonly value;
    constructor(value: string);
    static isValid(cpf: string): boolean;
    private static format;
    getValue(): string;
    equals(other: Cpf): boolean;
    toString(): string;
    validate(): boolean;
}
