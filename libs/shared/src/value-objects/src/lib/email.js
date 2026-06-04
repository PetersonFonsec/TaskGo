"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Email = void 0;
class Email {
    value;
    constructor(email) {
        if (!Email.isValid(email)) {
            throw new Error('Invalid email address');
        }
        this.value = email;
    }
    static isValid(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    toString() {
        return this.value;
    }
    getValue() {
        return this.value;
    }
    equals(other) {
        if (!other)
            return false;
        return this.value === other.getValue();
    }
    validate() {
        return Email.isValid(this.value);
    }
}
exports.Email = Email;
//# sourceMappingURL=email.js.map