import { describe, expect, it } from 'vitest';
import { compileScss } from './token-utils';

describe('API Sass da lib', () => {
  it('compila o ponto de entrada sem avisos', () => {
    const { css, warnings } = compileScss(`@use 'taskgo-tokens';`);
    expect(css).toContain('--tg-action-primary:');
    expect(warnings).toEqual([]);
  });

  it.each([
    ['medium', '600px'],
    ['expanded', '1024px'],
    ['large', '1440px'],
  ])('tg-from(%s) gera min-width %s', (name, width) => {
    const { css, warnings } = compileScss(
      `@use 'taskgo-tokens' as tg;\n.x { @include tg.tg-from(${name}) { color: red; } }`,
    );
    expect(css).toContain(`@media (min-width: ${width})`);
    expect(warnings).toEqual([]);
  });

  it('tg-from recusa breakpoint inexistente com mensagem clara', () => {
    expect(() =>
      compileScss(`@use 'taskgo-tokens' as tg;\n.x { @include tg.tg-from(huge) { color: red; } }`),
    ).toThrow(/Breakpoint inválido: huge/);
  });

  it('tg-type-scale-app troca a escala para a do app', () => {
    const { css } = compileScss(`@use 'taskgo-tokens' as tg;\n.app { @include tg.tg-type-scale-app; }`);
    const app = css.slice(css.indexOf('.app'));
    expect(app).toContain('--tg-type-display-size: 2rem');
    expect(app).toContain('--tg-type-title-1-size: 1.625rem');
    expect(app).toContain('--tg-type-label-size: 0.9375rem');
  });

  it('tg-ionic-theme é público e só usa tokens semânticos', () => {
    const { css } = compileScss(`@use 'taskgo-tokens' as tg;\n.ion { @include tg.tg-ionic-theme; }`);
    const block = css.slice(css.indexOf('.ion'));
    const ionDecls = [...block.matchAll(/(--ion-[\w-]+):\s*([^;]+);/g)];
    expect(ionDecls.map((d) => d[1])).toEqual(
      expect.arrayContaining([
        '--ion-color-primary',
        '--ion-color-primary-rgb',
        '--ion-color-primary-contrast',
        '--ion-color-primary-contrast-rgb',
        '--ion-color-primary-shade',
        '--ion-color-primary-tint',
      ]),
    );
    for (const [, name, value] of ionDecls) {
      expect(value, name).toMatch(/^var\(--tg-[\w-]+\)$/);
    }
  });
});
