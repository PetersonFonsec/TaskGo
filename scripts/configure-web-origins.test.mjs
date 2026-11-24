import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'taskgo-origins-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'scripts'));
  cpSync(new URL('scripts/configure-web-origins.mjs', root), join(dir, 'scripts/configure-web-origins.mjs'));
  for (const app of ['frontend', 'backoffice', 'landing-page']) {
    for (const file of [app === 'landing-page' ? 'index.html' : 'src/index.html', 'public/robots.txt', 'public/sitemap.xml']) {
      const target = join(dir, 'apps', app, file);
      mkdirSync(join(target, '..'), { recursive: true });
      cpSync(new URL(`apps/${app}/${file}`, root), target);
    }
  }
  const env = { ...process.env };
  for (const key of ['FRONTEND_PUBLIC_ORIGIN', 'BACKOFFICE_PUBLIC_ORIGIN', 'LANDING_PUBLIC_ORIGIN']) delete env[key];
  return {
    read: (app, file = 'src/index.html') => readFileSync(join(dir, 'apps', app, file), 'utf8'),
    run: (args = [], overrides = {}) => execFileSync(process.execPath, [join(dir, 'scripts/configure-web-origins.mjs'), ...args], { env: { ...env, ...overrides }, stdio: 'pipe' }),
  };
}

for (const app of ['frontend', 'backoffice']) {
  test(`staging configures ${app} only and is idempotent`, (t) => {
    const f = fixture(t);
    const other = app === 'frontend' ? 'backoffice' : 'frontend';
    const before = f.read(other);
    const landing = f.read('landing-page', 'index.html');
    f.run(['--staging', app]);
    const html = f.read(app);
    assert.ok(html.includes(`https://taskgo-${app}-git-staging-peterson-fonseca-simios-projects.vercel.app/share.png`));
    assert.ok(!html.includes('http://localhost:'));
    assert.ok(!f.read(app, 'public/sitemap.xml').includes('http://localhost:'));
    assert.equal(f.read(other), before);
    assert.equal(f.read('landing-page', 'index.html'), landing);
    f.run(['--staging', app]);
    assert.equal(f.read(app), html);
  });
}

test('explicit origins override staging and legacy invocation still works', (t) => {
  const f = fixture(t);
  f.run(['--staging', 'frontend'], { FRONTEND_PUBLIC_ORIGIN: 'https://preview.example.com' });
  assert.ok(f.read('frontend').includes('https://preview.example.com/share.png'));
  f.run([], { FRONTEND_PUBLIC_ORIGIN: 'https://production.example.com' });
  assert.ok(f.read('frontend').includes('https://production.example.com/share.png'));
});

test('invalid arguments and origins fail without modifying files', (t) => {
  const f = fixture(t);
  const before = f.read('frontend');
  assert.throws(() => f.run(['--staging', 'unknown']));
  assert.throws(() => f.run(['--staging', 'frontend'], { FRONTEND_PUBLIC_ORIGIN: 'https://example.com/path' }));
  assert.equal(f.read('frontend'), before);
});
