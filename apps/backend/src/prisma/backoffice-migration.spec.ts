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

const migrationName =
  '20260702120000_add_backoffice_admin_provider_audit_models';
const backendRoot = resolve(__dirname, '../..');
const migrationRoot = resolve(backendRoot, 'src/prisma/migrations');
const prismaBinary = resolve(backendRoot, 'node_modules/.bin/prisma');

function readEnvDatabaseUrl() {
  const envPath = resolve(backendRoot, '.env.test');
  const envFile = readFileSync(envPath, 'utf8');
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

describe('backoffice persistence migration', () => {
  const databaseUrl = readEnvDatabaseUrl();
  const schemaName = `task01_${Date.now()}`;
  const schemaUrl = withSchema(databaseUrl, schemaName);
  const tempDir = mkdtempSync(join(tmpdir(), 'taskgo-backoffice-migration-'));
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: schemaUrl,
      },
    },
  });

  beforeAll(async () => {
    executeSql(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
      databaseUrl,
      tempDir,
    );

    const migrations = readdirSync(migrationRoot)
      .filter((name) => /^\d+_/.test(name))
      .sort();

    for (const migration of migrations.filter((name) => name < migrationName)) {
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

      INSERT INTO "usuarios" ("id", "nome", "email", "senha_hash", "tipo", "created_at", "updated_at", "cpf")
      VALUES
        (9001, 'verified provider', 'verified-provider@example.com', 'hash', 'PRESTADOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '90010000001'),
        (9002, 'pending provider', 'pending-provider@example.com', 'hash', 'PRESTADOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, '90020000002');

      INSERT INTO "prestadores" ("id", "verificado", "created_at", "updated_at")
      VALUES
        (9001, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        (9002, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
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

  it('maps existing provider verification into deterministic lifecycle statuses', async () => {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: bigint; status: string; verificado: boolean }>
    >(
      'SELECT "id", "status"::text, "verificado" FROM "prestadores" WHERE "id" IN (9001, 9002) ORDER BY "id"',
    );

    expect(rows).toEqual([
      { id: BigInt(9001), status: 'APPROVED', verificado: true },
      { id: BigInt(9002), status: 'PENDING', verificado: false },
    ]);
  });

  it('rejects duplicate admin email and invalid lifecycle history relations', async () => {
    await prisma.adminUser.create({
      data: {
        name: 'Admin',
        email: 'admin@example.com',
        role: 'ADMINISTRATOR',
      },
    });

    await expect(
      prisma.adminUser.create({
        data: {
          name: 'Admin duplicate',
          email: 'admin@example.com',
          role: 'SUPPORT',
        },
      }),
    ).rejects.toThrow();

    await expect(
      prisma.providerDecision.create({
        data: {
          providerId: BigInt(9001),
          action: 'APPROVE',
          fromStatus: 'PENDING',
          toStatus: 'APPROVED',
          actorAdminId: BigInt(999999),
          actorRole: 'ADMINISTRATOR',
        },
      }),
    ).rejects.toThrow();
  });

  it('creates the provider queue, decision history, and audit filter indexes', async () => {
    const indexes = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname IN (
          'prestadores_status_created_at_idx',
          'provider_decisions_provider_id_created_at_idx',
          'audit_logs_actor_admin_id_created_at_idx',
          'audit_logs_action_created_at_idx',
          'audit_logs_entity_type_entity_id_created_at_idx',
          'audit_logs_request_id_idx',
          'audit_logs_created_at_idx'
        )
      ORDER BY indexname
      `,
    );

    expect(indexes.map((index) => index.indexname)).toEqual([
      'audit_logs_action_created_at_idx',
      'audit_logs_actor_admin_id_created_at_idx',
      'audit_logs_created_at_idx',
      'audit_logs_entity_type_entity_id_created_at_idx',
      'audit_logs_request_id_idx',
      'prestadores_status_created_at_idx',
      'provider_decisions_provider_id_created_at_idx',
    ]);
  });
});
