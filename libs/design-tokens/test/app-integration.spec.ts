import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileFile, compileScss, readJson, repoRoot, themeTokens } from './token-utils';

const TOKENS_INCLUDE = '../../libs/design-tokens/src';

interface AngularJson {
  projects: Record<
    string,
    {
      architect: Record<
        string,
        { options?: { styles?: unknown[]; stylePreprocessorOptions?: { includePaths?: string[] } } }
      >;
    }
  >;
}

function targetsWithStyles(app: string) {
  const json = readJson<AngularJson>(resolve(repoRoot, `apps/${app}/angular.json`));
  const project = Object.values(json.projects)[0];
  return Object.entries(project.architect).filter(([, target]) => target.options?.styles);
}

/** Compila o styles.scss do app com os mesmos includePaths do angular.json. */
function compileAppStyles(app: string) {
  const [, build] = targetsWithStyles(app).find(([name]) => name === 'build')!;
  const appRoot = resolve(repoRoot, `apps/${app}`);
  const includePaths = (build.options?.stylePreprocessorOptions?.includePaths ?? []).map((p) =>
    resolve(appRoot, p),
  );
  return compileFile(join(appRoot, 'src/styles.scss'), [
    ...includePaths,
    resolve(repoRoot, 'node_modules'),
  ]).css;
}

function lastValue(css: string, name: string): string | undefined {
  const all = [...css.matchAll(new RegExp(`${name}:\\s*([^;]+);`, 'g'))];
  return all.at(-1)?.[1].trim();
}

describe.each(['frontend', 'mobile'])('app %s', (app) => {
  it.each(targetsWithStyles(app).map(([name]) => name))(
    'o target %s enxerga a lib de tokens',
    (target) => {
      const options = Object.fromEntries(targetsWithStyles(app))[target].options;
      expect(options?.stylePreprocessorOptions?.includePaths ?? []).toContain(TOKENS_INCLUDE);
    },
  );

  it('carrega os tokens nos dois temas', () => {
    const css = compileAppStyles(app);
    expect(themeTokens(css, 'CUSTOMER').get('--tg-action-primary')).toBe('var(--tg-violet-600)');
    expect(themeTokens(css, 'PROVIDER').get('--tg-action-primary')).toBe('var(--tg-lime-300)');
  });
});

describe('isolamento da Etapa 6', () => {
  it('o app aplica a escala tipográfica do celular por cima da do web', () => {
    const css = compileAppStyles('mobile');
    expect(css).toContain('--tg-type-display-size: 2.75rem');
    expect(lastValue(css, '--tg-type-display-size')).toBe('2rem');
    expect(lastValue(css, '--tg-type-label-size')).toBe('0.9375rem');
  });

  it('a ponte Ionic continua desligada e o azul atual do app permanece', () => {
    const css = compileAppStyles('mobile');
    expect(css).not.toMatch(/--ion-[\w-]+:\s*var\(--tg-/);
    expect(lastValue(css, '--ion-color-primary')).toBe('#2563eb');
  });

  it('o web mantém os tokens antigos que as telas usam hoje', () => {
    const css = compileAppStyles('frontend');
    expect(css).toMatch(/--proxi-primary:/);
    expect(css).toMatch(/--color-primary:/);
  });
});

describe('histórias de fundamentos', () => {
  const dir = resolve(repoRoot, 'apps/frontend/src/design-system/foundations');
  const sources = readdirSync(dir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => readFileSync(join(dir, f), 'utf8'))
    .join('\n');
  const defined = themeTokens(compileScss(`@use 'taskgo-tokens';`).css, 'CUSTOMER');

  it('só citam tokens que existem', () => {
    // Nomes completos; prefixos montados em template (ex.: '--tg-status-') ficam de fora.
    const used = new Set([...sources.matchAll(/--tg-[\w-]*[\w]\b(?!-)/g)].map((m) => m[0]));
    const missing = [...used].filter((name) => !defined.has(name) && !name.endsWith('-'));
    expect(missing).toEqual([]);
  });

  it('a barra de modo do Storybook continua com CUSTOMER e PROVIDER', () => {
    const preview = readFileSync(resolve(repoRoot, 'apps/frontend/.storybook/preview.ts'), 'utf8');
    expect(preview).toContain("setAttribute('data-theme', theme)");
    expect(preview).toMatch(/value: 'CUSTOMER'/);
    expect(preview).toMatch(/value: 'PROVIDER'/);
  });
});
