import { cpfError, isValidCpf, mobileError, onlyDigits, passwordError, requiredError } from './register-validation';

describe('register validation', () => {
  it('checks the CPF check digits', () => {
    expect(isValidCpf('123.456.789-09')).toBeTrue();
    expect(isValidCpf('529.982.247-25')).toBeTrue();
    expect(isValidCpf('123.456.789-00')).toBeFalse();
    expect(isValidCpf('111.111.111-11')).toBeFalse();
    expect(cpfError('')).toBe('Informe seu CPF.');
    expect(cpfError('123.456')).toBe('Informe os 11 dígitos do CPF.');
    expect(cpfError('12345678900')).toBe('Confira o CPF: os dígitos não batem.');
    expect(cpfError('12345678909')).toBe('');
  });

  it('asks for a mobile with area code, optional when the field is', () => {
    expect(mobileError('')).toBe('Informe o celular com DDD.');
    expect(mobileError('', true)).toBe('');
    expect(mobileError('1191234')).toContain('com DDD, como');
    expect(mobileError('(11) 9 1234-5678')).toBe('');
  });

  it('follows the password length rule', () => {
    expect(passwordError('', 10, 72)).toBe('Crie uma senha.');
    expect(passwordError('a'.repeat(9), 10, 72)).toBe('Use pelo menos 10 caracteres.');
    expect(passwordError('a'.repeat(10), 10, 72)).toBe('');
    expect(passwordError('a'.repeat(73), 10, 72)).toBe('Use no máximo 72 caracteres.');
  });

  it('has small helpers for digits and required fields', () => {
    expect(onlyDigits('(11) 9-12')).toBe('11912');
    expect(onlyDigits(null)).toBe('');
    expect(requiredError('  ', 'Falta')).toBe('Falta');
    expect(requiredError('x', 'Falta')).toBe('');
  });
});
