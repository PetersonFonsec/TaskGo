const NODE_ENVIRONMENTS = new Set(['development', 'test', 'production']);

type Environment = Record<string, unknown>;

export function validateEnvironment(environment: Environment): Environment {
  const normalized = { ...environment };
  const nodeEnv = readString(environment, 'NODE_ENV') ?? 'development';

  if (!NODE_ENVIRONMENTS.has(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of: ${Array.from(NODE_ENVIRONMENTS).join(', ')}`,
    );
  }

  normalized.NODE_ENV = nodeEnv;
  normalized.PORT = readInteger(environment, 'PORT', 3000, {
    min: 1,
    max: 65535,
  });
  normalized.EXPIRES_IN = readString(environment, 'EXPIRES_IN') ?? '15m';
  normalized.DEFAULT_PLATFORM_FEE_PCT = readNumber(
    environment,
    'DEFAULT_PLATFORM_FEE_PCT',
    0.12,
    { min: 0, max: 1 },
  );
  normalized.ADMIN_INVITATION_TTL_HOURS = readInteger(
    environment,
    'ADMIN_INVITATION_TTL_HOURS',
    24,
    { min: 1 },
  );
  normalized.PAYMENTS_SIMULATION = readBoolean(
    environment,
    'PAYMENTS_SIMULATION',
    nodeEnv !== 'production',
  );

  requireString(environment, 'DATABASE_URL');
  requireString(environment, 'JWT_SECRET');

  if (nodeEnv === 'production') {
    requireString(environment, 'PUBLIC_FRONTEND_ORIGINS');
    requireString(environment, 'BACKOFFICE_FRONTEND_ORIGINS');

    if (normalized.PAYMENTS_SIMULATION === true) {
      throw new Error('PAYMENTS_SIMULATION must be false in production');
    }
    if (normalized.PAYMENTS_SIMULATION !== true) {
      requireString(environment, 'PAGARME_SECRET_KEY');
      requireString(environment, 'PAGARME_PLATFORM_RECIPIENT_ID');
    }
  }

  if (nodeEnv === 'production') {
    const secret = requireString(environment, 'JWT_SECRET');
    if (
      !/^[a-fA-F0-9]{64,}$/.test(secret) ||
      new Set(secret.toLowerCase()).size < 8
    )
      throw new Error(
        'JWT_SECRET must contain at least 32 random bytes encoded as hexadecimal',
      );
    for (const key of [
      'PUBLIC_FRONTEND_ORIGINS',
      'BACKOFFICE_FRONTEND_ORIGINS',
    ]) {
      for (const origin of requireString(environment, key).split(',')) {
        const url = new URL(origin.trim());
        if (
          url.protocol !== 'https:' ||
          url.origin !== origin.trim() ||
          url.username ||
          url.password
        )
          throw new Error(`${key} must contain HTTPS origins only`);
      }
    }
    if (normalized.EXPIRES_IN !== '15m')
      throw new Error('EXPIRES_IN must be 15m in production');
    const mfa = JSON.parse(requireString(environment, 'ADMIN_MFA_SECRETS'));
    if (
      !mfa ||
      typeof mfa !== 'object' ||
      Array.isArray(mfa) ||
      !Object.keys(mfa).length ||
      Object.entries(mfa).some(
        ([id, secret]) =>
          !/^[1-9]\d*$/.test(id) ||
          typeof secret !== 'string' ||
          !/^[A-Z2-7]{32,}$/.test(secret),
      )
    )
      throw new Error(
        'ADMIN_MFA_SECRETS must map operator ids to random Base32 secrets',
      );
    const invitation = new URL(
      requireString(environment, 'ADMIN_INVITATION_URL'),
    );
    if (
      invitation.protocol !== 'https:' ||
      !requireString(environment, 'BACKOFFICE_FRONTEND_ORIGINS')
        .split(',')
        .map((value) => value.trim())
        .includes(invitation.origin)
    )
      throw new Error(
        'ADMIN_INVITATION_URL must use an allowed HTTPS backoffice origin',
      );
    const smtp = new URL(requireString(environment, 'SMTP_URL'));
    if (!['smtp:', 'smtps:'].includes(smtp.protocol))
      throw new Error('SMTP_URL must use SMTP with TLS');
    const reset = new URL(
      requireString(environment, 'PASSWORD_RESET_FRONTEND_URL'),
    );
    if (
      reset.protocol !== 'https:' ||
      !requireString(environment, 'PUBLIC_FRONTEND_ORIGINS')
        .split(',')
        .map((value) => value.trim())
        .includes(reset.origin)
    )
      throw new Error(
        'PASSWORD_RESET_FRONTEND_URL must use an allowed HTTPS frontend origin',
      );
    requireString(environment, 'MAIL_FROM');
    if (requireString(environment, 'METRICS_TOKEN').length < 32)
      throw new Error(
        'METRICS_TOKEN must contain at least 32 random characters',
      );
  }
  return normalized;
}

function requireString(environment: Environment, key: string): string {
  const value = readString(environment, key);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function readString(environment: Environment, key: string) {
  const value = environment[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new Error(`${key} must be a string`);
  const normalized = value.trim();
  return normalized || undefined;
}

function readBoolean(
  environment: Environment,
  key: string,
  defaultValue: boolean,
) {
  const value = readString(environment, key);
  if (value === undefined) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${key} must be either true or false`);
}

function readInteger(
  environment: Environment,
  key: string,
  defaultValue: number,
  range: { min?: number; max?: number } = {},
) {
  const value = readNumber(environment, key, defaultValue, range);
  if (!Number.isInteger(value)) throw new Error(`${key} must be an integer`);
  return value;
}

function readNumber(
  environment: Environment,
  key: string,
  defaultValue: number,
  range: { min?: number; max?: number } = {},
) {
  const raw = readString(environment, key);
  const value = raw === undefined ? defaultValue : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${key} must be a number`);
  if (range.min !== undefined && value < range.min) {
    throw new Error(`${key} must be greater than or equal to ${range.min}`);
  }
  if (range.max !== undefined && value > range.max) {
    throw new Error(`${key} must be less than or equal to ${range.max}`);
  }
  return value;
}
