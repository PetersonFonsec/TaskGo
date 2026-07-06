const SECRET_KEY_PATTERN =
  /(password|senha|token|secret|authorization|cookie|api[-_]?key|credential|jwt|invitation)/i;
const COMPLETE_PERSONAL_RECORD_PATTERN =
  /^(user|usuario|customer|client|cliente|provider|prestador|adminUser|operator|actor|person)$/i;
const PERSONAL_FIELD_NAMES = new Set([
  'name',
  'nome',
  'email',
  'cpf',
  'phone',
  'telefone',
  'address',
  'endereco',
  'photoUrl',
  'fotoUrl',
  'birthDate',
  'dataNascimento',
]);

export type SanitizedLogValue =
  | string
  | number
  | boolean
  | null
  | SanitizedLogObject
  | SanitizedLogValue[];

export interface SanitizedLogObject {
  [key: string]: SanitizedLogValue;
}

export function sanitizeForStructuredLog(
  value: unknown,
): SanitizedLogValue | undefined {
  return sanitizeValue(value, '');
}

function sanitizeValue(
  value: unknown,
  keyPath: string,
  personalRecordContext = false,
): SanitizedLogValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value
      .map((item, index) => sanitizeValue(item, `${keyPath}[${index}]`))
      .filter((item): item is SanitizedLogValue => item !== undefined);
  }
  if (typeof value === 'object') {
    return sanitizeObject(
      value as Record<string, unknown>,
      keyPath,
      personalRecordContext,
    );
  }

  return undefined;
}

function sanitizeObject(
  value: Record<string, unknown>,
  keyPath: string,
  personalRecordContext: boolean,
): SanitizedLogObject {
  const personalFieldCount = Object.keys(value).filter((key) =>
    PERSONAL_FIELD_NAMES.has(key),
  ).length;

  if (personalRecordContext || personalFieldCount >= 3) {
    return { redacted: 'complete_personal_record' };
  }

  return Object.entries(value).reduce<SanitizedLogObject>(
    (acc, [key, item]) => {
      const path = keyPath ? `${keyPath}.${key}` : key;

      if (SECRET_KEY_PATTERN.test(key)) {
        acc[key] = '[REDACTED]';
        return acc;
      }

      const nextPersonalContext =
        COMPLETE_PERSONAL_RECORD_PATTERN.test(key) &&
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item) &&
        !(item instanceof Date);

      const sanitized = sanitizeValue(item, path, nextPersonalContext);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    },
    {},
  );
}
