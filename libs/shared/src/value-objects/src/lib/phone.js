"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phone = void 0;
class Phone {
    value;
    constructor(value) {
        if (!Phone.isValid(value))
            throw new Error("Invalid phone number");
        this.value = value;
    }
    static removeMask(value) {
        return value.replace(/\D/g, '').replace(' ', '');
    }
    static isValid(value) {
        const unmasked = Phone.removeMask(value);
        return /^\d{10,13}$/.test(unmasked);
    }
    toString() {
        return this.value;
    }
    equals(other) {
        if (!other)
            return false;
        return this.value === other.value;
    }
    validate() {
        return Phone.isValid(this.value);
    }
    getValue() {
        return Phone.removeMask(this.value);
    }
}
exports.Phone = Phone;
//# sourceMappingURL=phone.js.map