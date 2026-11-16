/** Regras dos passos do cadastro (Etapa 10). Funções puras, com testes próprios. */

export const onlyDigits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

/** CPF com 11 dígitos e os dois dígitos verificadores certos. */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function cpfError(value: string): string {
  const cpf = onlyDigits(value);
  if (!cpf) return 'Informe seu CPF.';
  if (cpf.length !== 11) return 'Informe os 11 dígitos do CPF.';
  return isValidCpf(cpf) ? '' : 'Confira o CPF: os dígitos não batem.';
}

/** Celular com DDD: 11 dígitos. Vazio vale só quando o campo é opcional. */
export function mobileError(value: string, optional = false): string {
  const phone = onlyDigits(value);
  if (!phone) return optional ? '' : 'Informe o celular com DDD.';
  return phone.length === 11 ? '' : 'Informe o celular com DDD, como (11) 9 1234-5678.';
}

export function requiredError(value: string, message: string): string {
  return value.trim() ? '' : message;
}

/** Foca o primeiro campo com erro, na ordem em que aparecem na tela. */
export function focusFirstInvalid(fields: { error: string; element?: HTMLElement | null }[]): boolean {
  const first = fields.find((field) => field.error);
  first?.element?.focus();
  return !!first;
}

export function passwordError(value: string, min: number, max: number): string {
  if (!value) return 'Crie uma senha.';
  if (value.length < min) return `Use pelo menos ${min} caracteres.`;
  if (value.length > max) return `Use no máximo ${max} caracteres.`;
  return '';
}
