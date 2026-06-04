"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const cpf_1 = require("./cpf");
const email_1 = require("./email");
const phone_1 = require("./phone");
class User {
    id;
    name;
    email;
    password;
    createdAt;
    updatedAt;
    photoUrl;
    phone;
    cpf;
    type;
    constructor(init) {
        this.validateFields(init);
    }
    equals(other) {
        if (!other)
            return false;
        return this.id === other.id;
    }
    validateFields(init) {
        const fieldsRequiredValidations = ['email', 'phone', 'cpf'];
        for (const field in init) {
            const value = init[field];
            if (!fieldsRequiredValidations.includes(field)) {
                this[field] = value;
            }
            switch (field) {
                case 'email':
                    this.email = new email_1.Email(value);
                    break;
                case 'phone':
                    this.phone = new phone_1.Phone(value);
                    break;
                case 'cpf':
                    this.cpf = new cpf_1.Cpf(value);
                    break;
            }
        }
    }
    validate() {
        return !!this.email?.validate() && !!this.phone?.validate() && !!this.cpf?.validate();
    }
    getValue() {
        return this;
    }
    toString() {
        return `User: ${this.id}, Name: ${this.name}, Email: ${this.email?.toString()}`;
    }
}
exports.User = User;
//# sourceMappingURL=user.js.map