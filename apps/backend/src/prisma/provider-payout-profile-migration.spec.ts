import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';

import { CreateProviderStrategy } from '../modules/user/commands/create-user/strategies/create-provider.strategy';

const migrationName = '20260724043000_add_provider_payout_profile_and_social';
const backendRoot = resolve(__dirname, '../..');
const migrationRoot = resolve(backendRoot, 'src/prisma/migrations');
const prismaBinary = resolve(backendRoot, 'node_modules/.bin/prisma');

function readEnvDatabaseUrl() {
  const envFile = readFileSync(resolve(backendRoot, '.env.test'), 'utf8');
  const databaseUrl = envFile
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .find((line) => line.startsWith('DATABASE_URL='));

  if (!databaseUrl)
    throw new Error('DATABASE_URL not found in apps/backend/.env.test');

  return databaseUrl.slice('DATABASE_URL='.length).replace(/^['"]|['"]$/g, '');
}

function withSchema(url: string, schema: string) {
  const parsed = new URL(url);
  parsed.searchParams.set('schema', schema);
  return parsed.toString();
}

function executeSql(sql: string, databaseUrl: string, tempDir: string) {
  const file = join(tempDir, `sql-${Date.now()}-${Math.random()}.sql`);
  writeFileSync(file, sql);
  const result = spawnSync(
    prismaBinary,
    ['db', 'execute', '--url', databaseUrl, '--file', file],
    {
      cwd: backendRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      encoding: 'utf8',
      timeout: 15_000,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      [
        `prisma db execute failed with status ${result.status}`,
        result.stdout,
        result.stderr,
      ].join('\n'),
    );
  }
}

describe('provider payout profile migration', () => {
  const databaseUrl = readEnvDatabaseUrl();
  const schemaName = `task03_${Date.now()}`;
  const schemaUrl = withSchema(databaseUrl, schemaName);
  const tempDir = mkdtempSync(join(tmpdir(), 'taskgo-payout-migration-'));
  const prisma = new PrismaClient({
    datasources: { db: { url: schemaUrl } },
  });

  beforeAll(async () => {
    executeSql(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
      databaseUrl,
      tempDir,
    );

    const migrations = readdirSync(migrationRoot)
      .filter((name) => /^\d+_/.test(name) && name < migrationName)
      .sort();

    for (const migration of migrations) {
      const sql = readFileSync(
        join(migrationRoot, migration, 'migration.sql'),
        'utf8',
      );
      executeSql(
        `SET search_path TO "${schemaName}";\n${sql}`,
        databaseUrl,
        tempDir,
      );
    }

    executeSql(
      `
      SET search_path TO "${schemaName}";
      INSERT INTO "usuarios" (
        "id", "nome", "email", "senha_hash", "tipo",
        "created_at", "updated_at", "cpf"
      )
      VALUES
        (9301, 'recipient provider', 'recipient-03@example.com', 'hash', 'PRESTADOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '93010000001'),
        (9302, 'empty provider', 'empty-03@example.com', 'hash', 'PRESTADOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '93020000002');

      INSERT INTO "prestadores" (
        "id", "pagarme_recipient_id", "created_at", "updated_at"
      )
      VALUES
        (9301, 'rp_existing_03', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (9302, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
      `,
      databaseUrl,
      tempDir,
    );

    const migrationSql = readFileSync(
      join(migrationRoot, migrationName, 'migration.sql'),
      'utf8',
    );
    executeSql(
      `SET search_path TO "${schemaName}";\n${migrationSql}`,
      databaseUrl,
      tempDir,
    );
    await prisma.$connect();
  }, 120_000);

  afterAll(async () => {
    await prisma.$disconnect();
    executeSql(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`,
      databaseUrl,
      tempDir,
    );
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('preserves recipient identifiers without confirming bank readiness', async () => {
    const profiles = await prisma.providerPayoutProfile.findMany({
      where: { providerId: { in: [BigInt(9301), BigInt(9302)] } },
      orderBy: { providerId: 'asc' },
    });

    expect(profiles).toEqual([
      expect.objectContaining({
        providerId: BigInt(9301),
        pagarmeRecipientId: 'rp_existing_03',
        syncStatus: 'UNKNOWN',
        bankAccountStatus: 'UNCONFIRMED',
      }),
      expect.objectContaining({
        providerId: BigInt(9302),
        pagarmeRecipientId: null,
        syncStatus: 'UNKNOWN',
        bankAccountStatus: 'UNCONFIRMED',
      }),
    ]);
  });

  it('enforces one profile per provider and unique recipient identifiers', async () => {
    await expect(
      prisma.providerPayoutProfile.create({
        data: { providerId: BigInt(9301) },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.providerPayoutProfile.update({
        where: { providerId: BigInt(9302) },
        data: { pagarmeRecipientId: 'rp_existing_03' },
      }),
    ).rejects.toThrow();
  });

  it('assigns safe defaults to direct legacy-compatible provider creation', async () => {
    const provider = await prisma.provider.create({
      data: {
        pagarmeRecipientId: 'rp_direct_03',
        user: {
          create: {
            name: 'direct provider',
            email: 'direct-03@example.com',
            passwordHash: 'hash',
            cpf: '93040000004',
            type: 'PRESTADOR',
          },
        },
      },
    });
    const profile = await prisma.providerPayoutProfile.findUniqueOrThrow({
      where: { providerId: provider.id },
    });

    expect(profile).toEqual(
      expect.objectContaining({
        pagarmeRecipientId: 'rp_direct_03',
        syncStatus: 'UNKNOWN',
        bankAccountStatus: 'UNCONFIRMED',
      }),
    );
  });

  it('persists structured social values and safe payout defaults together', async () => {
    await prisma.provider.update({
      where: { id: BigInt(9302) },
      data: {
        whatsapp: '+5511999999999',
        instagram: '@provider',
        facebook: 'provider',
        linkedin: 'provider',
      },
    });

    const provider = await prisma.provider.findUniqueOrThrow({
      where: { id: BigInt(9302) },
      include: { payoutProfile: true },
    });

    expect(provider).toEqual(
      expect.objectContaining({
        whatsapp: '+5511999999999',
        instagram: '@provider',
        facebook: 'provider',
        linkedin: 'provider',
        payoutProfile: expect.objectContaining({
          syncStatus: 'UNKNOWN',
          bankAccountStatus: 'UNCONFIRMED',
        }),
      }),
    );
  });

  it('persists structured social values through the registration transaction', async () => {
    const service = await prisma.service.create({
      data: {
        providerId: BigInt(9301),
        title: 'Registration service',
        category: 'Test',
        basePrice: 100,
      },
    });
    const strategy = new CreateProviderStrategy(prisma as never);
    const command = {
      name: 'registered provider',
      email: 'registered-03@example.com',
      password: 'hash',
      phone: '+5511888888888',
      cpf: '93030000003',
      type: 'PRESTADOR' as const,
      address: {
        label: 'Home',
        street: 'Main Street',
        number: '10',
        city: 'Sao Paulo',
        state: 'SP',
        cep: '01001000',
        lat: -23.55,
        lng: -46.63,
      },
      services: [service.id],
      social: {
        whatsapp: '+5511888888888',
        instagram: '@registered',
        facebook: 'registered',
        linkedin: 'registered-canonical',
        linkdin: 'registered-legacy',
      },
    };

    const result = await strategy.execute(command as never);
    const provider = await prisma.provider.findUniqueOrThrow({
      where: { id: BigInt(result.id!) },
      include: { payoutProfile: true },
    });

    expect(provider).toEqual(
      expect.objectContaining({
        whatsapp: '+5511888888888',
        instagram: '@registered',
        facebook: 'registered',
        linkedin: 'registered-canonical',
        payoutProfile: expect.objectContaining({
          syncStatus: 'UNKNOWN',
          bankAccountStatus: 'UNCONFIRMED',
        }),
      }),
    );
  });
});
