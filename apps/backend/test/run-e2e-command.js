const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const envFile = readFileSync(resolve(__dirname, '../.env.test'), 'utf8');
const fileEnv = Object.fromEntries(envFile
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
  }));

if (!fileEnv.DATABASE_URL) throw new Error('DATABASE_URL não configurada em .env.test');
const databaseUrl = new URL(fileEnv.DATABASE_URL);
databaseUrl.pathname = '/taskgo_test';

const [command, ...args] = process.argv.slice(2);
if (!['jest', 'prisma'].includes(command)) throw new Error(`Comando e2e não permitido: ${command}`);
const binary = resolve(__dirname, '../node_modules/.bin', command);
const result = spawnSync(binary, args, {
  cwd: resolve(__dirname, '..'),
  env: { ...process.env, ...fileEnv, DATABASE_URL: databaseUrl.toString(), NODE_ENV: 'test', PAYMENTS_SIMULATION: 'true' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
