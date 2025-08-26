export class Phone {
    private readonly value: string;

    constructor(value: string) {
        if (!Phone.isValid(value)) {
            throw new Error('Invalid phone number');
        }
        this.value = value;
    }

    static isValid(value: string): boolean {
        // Exemplo simples de validação: apenas dígitos, tamanho entre 10 e 13
        return /^\d{10,13}$/.test(value);
    }

    getValue(): string {
        return this.value;
    }
}