import { BadRequestException } from '@nestjs/common';
import { registerDecorator, ValidationOptions } from 'class-validator';

const COMMON = new Set([
  '1234567890',
  '123456789012',
  'password123',
  'password1234',
  'qwerty123456',
  'senha123456',
  'admin123456',
  '12345678910',
]);
export function isSafePassword(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 12 &&
    Buffer.byteLength(value, 'utf8') <= 72 &&
    !COMMON.has(value.toLowerCase()) &&
    !/^(.)\1+$/.test(value)
  );
}
export function assertSafePassword(value: unknown): asserts value is string {
  if (!isSafePassword(value))
    throw new BadRequestException(
      'Use uma senha não comum de pelo menos 12 caracteres e no máximo 72 bytes.',
    );
}
export function SafePassword(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: 'safePassword',
      target: target.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate: isSafePassword,
        defaultMessage: () =>
          'Use uma senha não comum de 12 caracteres a 72 bytes.',
      },
    });
}
