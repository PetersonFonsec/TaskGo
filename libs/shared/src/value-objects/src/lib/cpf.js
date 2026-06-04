"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cpf = void 0;
class Cpf {
    value;
    constructor(value) {
        if (!Cpf.isValid(value))
            throw new Error("Invalid CPF");
        this.value = Cpf.format(value);
    }
    static isValid(cpf) {
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned))
            return false;
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned.charAt(i)) * (10 - i);
        }
        let firstCheck = (sum * 10) % 11;
        if (firstCheck === 10)
            firstCheck = 0;
        if (firstCheck !== parseInt(cleaned.charAt(9)))
            return false;
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleaned.charAt(i)) * (11 - i);
        }
        let secondCheck = (sum * 10) % 11;
        if (secondCheck === 10)
            secondCheck = 0;
        if (secondCheck !== parseInt(cleaned.charAt(10)))
            return false;
        return true;
    }
    static format(cpf) {
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    getValue() {
        return this.value.replace(/\D/g, '');
    }
    equals(other) {
        if (!other)
            return false;
        return this.value === other.getValue();
    }
    toString() {
        return this.value;
    }
    validate() {
        return Cpf.isValid(this.value);
    }
}
exports.Cpf = Cpf;
//# sourceMappingURL=cpf.js.map