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
      }),
    );
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
  ])('rejects invalid %s values', (key, value, message) => {
    expect(() =>
      validateEnvironment({ ...minimumEnvironment, [key]: value }),
    ).toThrow(message);
  });
});
