const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const {
  AppModule,
} = require('../../apps/backend/dist/apps/backend/src/app.module.js');
const {
  totp,
} = require('../../apps/backend/dist/apps/backend/src/shared/security/admin-mfa.service.js');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(url.port, '55432');
  assert.equal(url.pathname, '/proxi_verify');
  assert.equal(process.env.NODE_ENV, 'test');
  const db = new PrismaClient();
  const suffix = randomUUID();
  const password = 'isolated-passphrase-2026';
  const customer = await db.user.create({
    data: {
      name: 'Security HTTP test',
      email: suffix + '@example.invalid',
      cpf: suffix,
      passwordHash: await bcrypt.hash(password, 4),
      type: 'CLIENTE',
    },
  });
  const admin = await db.adminUser.create({
    data: {
      name: 'Security MFA test',
      email: suffix + '-admin@example.invalid',
      passwordHash: await bcrypt.hash(password, 4),
      role: 'ADMINISTRATOR',
      active: true,
      activatedAt: new Date(),
    },
  });
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC test vector, never a production secret.
  process.env.ADMIN_MFA_SECRETS = JSON.stringify({
    [admin.id.toString()]: secret,
  });
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const origin = 'https://taskgo.test';
    const send = (path, body, cookie, requestOrigin = origin) =>
      fetch(base + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(requestOrigin ? { Origin: requestOrigin } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    await db.securityRateLimit.deleteMany();
    let response = await send('/auth/login', {
      email: customer.email,
      password,
    });
    assert.equal(response.status, 201);
    const cookieHeader = response.headers.get('set-cookie');
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    const cookie = cookieHeader.split(';')[0];
    assert.equal((await response.json()).access_token, '');
    assert.equal((await send('/auth/me', null, cookie)).status, 200);
    assert.equal(
      (await send('/auth/logout', {}, cookie, 'https://attacker.test')).status,
      403,
    );
    assert.equal((await send('/auth/logout', {}, cookie, null)).status, 403);
    assert.equal((await send('/auth/logout', {}, cookie)).status, 201);
    assert.equal((await send('/auth/me', null, cookie)).status, 401);

    await db.securityRateLimit.deleteMany();
    assert.equal(
      (await send('/admin/auth/login', { email: admin.email, password }))
        .status,
      403,
    );
    const otp = totp(secret, Math.floor(Date.now() / 30000));
    response = await send('/admin/auth/login', {
      email: admin.email,
      password,
      otp,
    });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).access_token, '');
    const adminCookie = response.headers.get('set-cookie').split(';')[0];
    assert.equal(
      (await send('/admin/auth/login', { email: admin.email, password, otp }))
        .status,
      403,
    );
    assert.equal((await send('/admin/auth/me', null, adminCookie)).status, 200);
    assert.equal(
      (await send('/admin/auth/logout', {}, adminCookie)).status,
      201,
    );
    assert.equal((await send('/admin/auth/me', null, adminCookie)).status, 401);

    await db.securityRateLimit.deleteMany();
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await send('/auth/login', {
            email: suffix + '-absent@example.invalid',
            password,
          })
        ).status,
        403,
      );
    response = await send('/auth/login', {
      email: suffix + '-absent@example.invalid',
      password,
    });
    assert.equal(response.status, 429);
    assert(Number(response.headers.get('retry-after')) > 0);
    const rows = await db.securityRateLimit.findMany();
    assert(rows.every((row) => /^[a-f0-9]{64}$/.test(row.key)));
    console.log(
      'PASS: real HTTP login, HttpOnly cookies, CSRF origin checks, customer/admin revocation, MFA replay and shared database rate limits',
    );
  } finally {
    await app.close();
    await db.securityRateLimit.deleteMany();
    await db.adminUser.delete({ where: { id: admin.id } });
    await db.user.delete({ where: { id: customer.id } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
