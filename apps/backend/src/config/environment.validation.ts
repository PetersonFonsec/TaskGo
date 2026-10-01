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
  normalized.EXPIRES_IN = readString(environment, 'EXPIRES_IN') ?? '1d';
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

  normalized.ORDER_EXPIRATION_ENABLED = readBoolean(
    environment,
    'ORDER_EXPIRATION_ENABLED',
    nodeEnv !== 'test',
  );
  normalized.ORDER_EXPIRATION_INTERVAL_SECONDS = readInteger(
    environment,
    'ORDER_EXPIRATION_INTERVAL_SECONDS',
    300,
    { min: 30, max: 86400 },
  );
  normalized.ORDER_APPROVAL_TIMEOUT_HOURS = readNumber(
    environment,
    'ORDER_APPROVAL_TIMEOUT_HOURS',
    12,
    { min: 0.25, max: 720 },
  );
  normalized.ORDER_PAYMENT_TIMEOUT_HOURS = readNumber(
    environment,
    'ORDER_PAYMENT_TIMEOUT_HOURS',
    2,
    { min: 0.25, max: 720 },
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
      requireString(environment, 'ABACATEPAY_API_KEY');
      requireString(environment, 'ABACATEPAY_WEBHOOK_SECRET');
      if (readBoolean(environment, 'ABACATEPAY_DEV_MODE', false))
        throw new Error('ABACATEPAY_DEV_MODE must be false in production');
    }
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
