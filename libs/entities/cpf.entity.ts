export class Cpf {
    private readonly value: string;

    constructor(value: string) {
        if (!Cpf.isValid(value)) {
            throw new Error('CPF inválido');
        }
        this.value = Cpf.format(value);
    }

    public getValue(): string {
        return this.value;
    }

    public static isValid(cpf: string): boolean {
        const cleaned = cpf.replace(/\D/g, '');
        if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned.charAt(i)) * (10 - i);
        }
        let firstCheck = (sum * 10) % 11;
        if (firstCheck === 10) firstCheck = 0;
        if (firstCheck !== parseInt(cleaned.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleaned.charAt(i)) * (11 - i);
        }
        let secondCheck = (sum * 10) % 11;
        if (secondCheck === 10) secondCheck = 0;
        if (secondCheck !== parseInt(cleaned.charAt(10))) return false;

        return true;
    }

    private static format(cpf: string): string {
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
}