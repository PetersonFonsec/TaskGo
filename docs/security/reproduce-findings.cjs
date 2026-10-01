const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = process.cwd();
const swc = require(path.join(root, 'node_modules/@swc/core'));
require.extensions['.ts'] = (module, filename) => {
  const { code } = swc.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'typescript', decorators: true }, target: 'es2022', transform: { legacyDecorator: true, decoratorMetadata: true } },
    module: { type: 'commonjs' }
  });
  module._compile(code, filename);
};
require(path.join(root, 'node_modules/reflect-metadata'));
const load = p => require(path.join(root, 'apps/backend/src', p));
const backendRequire = require('node:module').createRequire(path.join(root, 'apps/backend/package.json'));
(async () => {
  const { validate } = backendRequire('class-validator');
  const { CreateUserDto } = load('modules/user/dto/create-user.dto.ts');
  const dto = Object.assign(new CreateUserDto(), { password: 'x', name: 'Teste', phone: '11999999999', email: 'review@example.invalid', cpf: '12345678901', type: 'CLIENTE' });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  assert(!errors.some(e => e.property === 'password'));
  console.log('PASS S05: registration DTO accepts a one-character password');
  const bcrypt = backendRequire('bcrypt');
  const hash = await bcrypt.hash('a'.repeat(72) + 'original', 4);
  assert(await bcrypt.compare('a'.repeat(72) + 'different', hash));
  console.log('PASS S05: passwords sharing the first 72 bytes authenticate identically');
  const { UserService } = load('modules/user/user.service.ts');
  let changed;
  const prisma = { user: { update: async args => { changed = args; return { id: 1n, ...args.data }; } } };
  await new UserService(prisma, {}).update(1n, { email: 'new@example.invalid' });
  assert.equal(changed.data.email, 'new@example.invalid');
  assert.equal(changed.data.emailVerified, false);
  assert(!('passwordChangedAt' in changed.data));
  console.log('PASS S04: email changes directly without verification, password or session invalidation');
  const { UserVerificationService } = load('modules/user/user-verification.service.ts');
  const verification = new UserVerificationService();
  await verification.requestEmailVerification(1n, 'review@example.invalid');
  const code = verification.pendingCodes.get('email:1'); // Inspection of a test-only instance, no production code or account.
  for (let i = 0; i < 1000; i++) assert.equal(await verification.verifyEmailCode(1n, 'WRONG!'), false);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 365 * 86400000;
  try { assert.equal(await verification.verifyEmailCode(1n, code), true); }
  finally { Date.now = originalNow; }
  console.log('PASS S06: 1000 invalid attempts do not invalidate code; no expiry check after a year');
  const { validateEnvironment } = load('config/environment.validation.ts');
  const env = validateEnvironment({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://test:test@localhost/test', JWT_SECRET: 'x', PUBLIC_FRONTEND_ORIGINS: 'https://example.invalid', BACKOFFICE_FRONTEND_ORIGINS: 'https://admin.example.invalid', PAYMENTS_SIMULATION: 'false', ABACATEPAY_API_KEY: 'dummy', ABACATEPAY_WEBHOOK_SECRET: 'dummy' });
  assert.equal(env.JWT_SECRET, 'x');
  console.log('PASS S01: production environment accepts a one-character JWT signing secret');
  const { ProviderService } = load('modules/provider/provider.service.ts');
  const start = new Date(Date.now() + 86400000 * 2); start.setUTCHours(12, 0, 0, 0);
  const end = new Date(start.getTime() + 3600000);
  const date = start.toISOString().slice(0, 10);
  const weekday = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][start.getUTCDay()];
  let conflictQuery;
  const availability = { timezone: 'America/Sao_Paulo', weekdays: { [weekday]: [{ start: '09:00', end: '10:00', slotMinutes: 60 }] } };
  const db = { service: { findMany: async () => [{ id: 1n, availability }] }, order: { findMany: async args => { conflictQuery = args; return [{ serviceId: 1n, scheduledFor: start, scheduledEnd: end, service: { id: 1n, availability } }]; } } };
  const result = await new ProviderService(db).getAvailability('1', { from: date, to: date, serviceId: '1' });
  assert(conflictQuery.where.status.in.includes('AGUARDANDO_APROVACAO'));
  assert.equal(result.days[0].slots.length, 0);
  assert(!('requestedAt' in conflictQuery.where));
  console.log('PASS S08: unpaid pending approval blocks a slot without reservation-age filtering');
  console.log('6 probe groups passed; mocks only; no database, external requests, real credentials or account mutations');
})().catch(e => { console.error(e.message); process.exitCode = 1; });
