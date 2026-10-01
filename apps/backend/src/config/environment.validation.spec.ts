import { validateEnvironment } from './environment.validation';

describe('environment validation', () => {
  const minimumEnvironment = {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://taskgo.test/database',
    JWT_SECRET: 'test-secret',
  };

  it('normalizes safe defaults outside production', () => {
    expect(validateEnvironment(minimumEnvironment)).toEqual(
      expect.objectContaining({
        NODE_ENV: 'test',
        PORT: 3000,
        EXPIRES_IN: '1d',
        DEFAULT_PLATFORM_FEE_PCT: 0.12,
        ADMIN_INVITATION_TTL_HOURS: 24,
        PAYMENTS_SIMULATION: true,
        ORDER_EXPIRATION_ENABLED: false,
        ORDER_EXPIRATION_INTERVAL_SECONDS: 300,
        ORDER_APPROVAL_TIMEOUT_HOURS: 12,
        ORDER_PAYMENT_TIMEOUT_HOURS: 2,
      }),
    );
  });

  it('enables order expiration by default outside tests', () => {
    expect(
      validateEnvironment({ ...minimumEnvironment, NODE_ENV: 'development' }),
    ).toEqual(expect.objectContaining({ ORDER_EXPIRATION_ENABLED: true }));
  });

  it.each(['DATABASE_URL', 'JWT_SECRET'])('rejects a missing %s', (key) => {
    const environment: Record<string, unknown> = { ...minimumEnvironment };
    delete environment[key];

    expect(() => validateEnvironment(environment)).toThrow(
      `${key} is required`,
    );
  });

  it('requires explicit frontend origins in production', () => {
    expect(() =>
      validateEnvironment({
        ...minimumEnvironment,
        NODE_ENV: 'production',
        PAYMENTS_SIMULATION: 'true',
      }),
    ).toThrow('PUBLIC_FRONTEND_ORIGINS is required');
  });

  it('requires payment credentials when production simulation is disabled', () => {
    expect(() =>
      validateEnvironment({
        ...minimumEnvironment,
        NODE_ENV: 'production',
        PUBLIC_FRONTEND_ORIGINS: 'https://taskgo.example',
        BACKOFFICE_FRONTEND_ORIGINS: 'https://admin.taskgo.example',
        PAYMENTS_SIMULATION: 'false',
      }),
    ).toThrow('PAGARME_SECRET_KEY is required');
  });

  it('forbids simulated money in production', () => {
    expect(() =>
      validateEnvironment({
        ...minimumEnvironment,
        NODE_ENV: 'production',
        PUBLIC_FRONTEND_ORIGINS: 'https://proxi.example',
        BACKOFFICE_FRONTEND_ORIGINS: 'https://admin.proxi.example',
        PAYMENTS_SIMULATION: 'true',
      }),
    ).toThrow('PAYMENTS_SIMULATION must be false in production');
  });

  it.each([
    ['PORT', '0', 'PORT must be greater than or equal to 1'],
    ['PORT', 'invalid', 'PORT must be a number'],
    [
      'DEFAULT_PLATFORM_FEE_PCT',
      '1.1',
      'DEFAULT_PLATFORM_FEE_PCT must be less than or equal to 1',
    ],
    [
      'PAYMENTS_SIMULATION',
      'yes',
      'PAYMENTS_SIMULATION must be either true or false',
    ],
    [
      'ORDER_APPROVAL_TIMEOUT_HOURS',
      '0',
      'ORDER_APPROVAL_TIMEOUT_HOURS must be greater than or equal to 0.25',
    ],
    [
      'ORDER_PAYMENT_TIMEOUT_HOURS',
      'abc',
      'ORDER_PAYMENT_TIMEOUT_HOURS must be a number',
    ],
    [
      'ORDER_EXPIRATION_INTERVAL_SECONDS',
      '5',
      'ORDER_EXPIRATION_INTERVAL_SECONDS must be greater than or equal to 30',
    ],
  ])('rejects invalid %s values', (key, value, message) => {
    expect(() =>
      validateEnvironment({ ...minimumEnvironment, [key]: value }),
    ).toThrow(message);
  });
});
