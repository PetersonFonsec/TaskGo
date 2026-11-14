import { beforeAll, describe, expect, it } from 'vitest';
import {
  compileScss,
  contrastRatio,
  hexToRgb,
  readRules,
  resolveToken,
  themeTokens,
  type Theme,
  type TokenMap,
} from './token-utils';

const THEMES: Theme[] = ['CUSTOMER', 'PROVIDER'];

const REQUIRED_SEMANTIC = [
  '--tg-bg-canvas',
  '--tg-bg-surface',
  '--tg-bg-subtle',
  '--tg-text-primary',
  '--tg-text-secondary',
  '--tg-text-disabled',
  '--tg-text-on-action',
  '--tg-text-on-accent',
  '--tg-border-default',
  '--tg-border-strong',
  '--tg-action-primary',
  '--tg-action-primary-hover',
  '--tg-action-primary-shade',
  '--tg-action-primary-tint',
  '--tg-action-subtle',
  '--tg-action-subtle-text',
  '--tg-accent',
  '--tg-focus-ring',
  '--tg-action-primary-rgb',
  '--tg-text-on-action-rgb',
  '--tg-bg-canvas-rgb',
  '--tg-text-primary-rgb',
];

const STATUSES = ['waiting', 'confirmed', 'progress', 'done', 'cancelled'];
const FEEDBACK = ['success', 'warning', 'danger', 'info'];

// Pares de texto (WCAG 1.4.3, texto normal: 4,5:1). Valem nos dois temas.
const TEXT_PAIRS: [fg: string, bg: string][] = [
  ['--tg-text-primary', '--tg-bg-canvas'],
  ['--tg-text-primary', '--tg-bg-surface'],
  ['--tg-text-primary', '--tg-bg-subtle'],
  ['--tg-text-secondary', '--tg-bg-canvas'],
  ['--tg-text-secondary', '--tg-bg-surface'],
  ['--tg-text-secondary', '--tg-bg-subtle'],
  ['--tg-text-on-action', '--tg-action-primary'],
  ['--tg-text-on-action', '--tg-action-primary-hover'],
  ['--tg-action-subtle-text', '--tg-action-subtle'],
  ['--tg-text-on-accent', '--tg-accent'],
  ...FEEDBACK.map((f): [string, string] => [`--tg-feedback-${f}-text`, `--tg-feedback-${f}-bg`]),
  ...STATUSES.map((s): [string, string] => [`--tg-status-${s}-text`, `--tg-status-${s}-bg`]),
];

// Contraste não textual (WCAG 1.4.11; foco também 2.4.13): 3:1 contra as superfícies onde aparecem.
// border-default é divisória decorativa e text-disabled é estado inativo: ficam de fora.
const NON_TEXT_PAIRS: [fg: string, bg: string][] = [
  ['--tg-border-strong', '--tg-bg-canvas'],
  ['--tg-border-strong', '--tg-bg-surface'],
  ['--tg-focus-ring', '--tg-bg-canvas'],
  ['--tg-focus-ring', '--tg-bg-surface'],
];

const RGB_PAIRS: [rgb: string, color: string][] = [
  ['--tg-action-primary-rgb', '--tg-action-primary'],
  ['--tg-text-on-action-rgb', '--tg-text-on-action'],
  ['--tg-bg-canvas-rgb', '--tg-bg-canvas'],
  ['--tg-text-primary-rgb', '--tg-text-primary'],
];

let css: string;
const tokens = {} as Record<Theme, TokenMap>;

beforeAll(() => {
  css = compileScss(`@use 'taskgo-tokens';`).css;
  for (const theme of THEMES) tokens[theme] = themeTokens(css, theme);
});

describe('contrato dos tokens', () => {
  it('emite o bloco do modo prestador', () => {
    const selectors = readRules(css).map((r) => r.selector);
    expect(selectors).toContain(':root');
    expect(selectors).toContain(':root[data-theme=PROVIDER]');
  });

  it('não referencia custom property inexistente', () => {
    for (const theme of THEMES) {
      for (const [name, value] of tokens[theme]) {
        for (const ref of value.matchAll(/var\((--[\w-]+)/g)) {
          expect(tokens[theme].has(ref[1]), `${theme}: ${name} usa ${ref[1]}`).toBe(true);
        }
      }
    }
  });

  describe.each(THEMES)('tema %s', (theme) => {
    it.each(REQUIRED_SEMANTIC)('define %s', (name) => {
      expect(() => resolveToken(tokens[theme], name)).not.toThrow();
    });

    it.each(STATUSES)('status %s tem texto e fundo', (status) => {
      expect(resolveToken(tokens[theme], `--tg-status-${status}-text`)).toMatch(/^#/);
      expect(resolveToken(tokens[theme], `--tg-status-${status}-bg`)).toMatch(/^#/);
    });

    it.each(RGB_PAIRS)('%s corresponde a %s', (rgbName, colorName) => {
      const channels = resolveToken(tokens[theme], rgbName)
        .split(',')
        .map((c) => Number(c.trim()));
      expect(channels).toEqual(hexToRgb(resolveToken(tokens[theme], colorName)));
    });
  });
});

describe('contraste WCAG 2.2', () => {
  it('calcula a razão de referência', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  describe.each(THEMES)('tema %s', (theme) => {
    it.each(TEXT_PAIRS)('texto %s sobre %s tem pelo menos 4,5:1', (fg, bg) => {
      const ratio = contrastRatio(resolveToken(tokens[theme], fg), resolveToken(tokens[theme], bg));
      expect(ratio, `${fg} / ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
    });

    it.each(NON_TEXT_PAIRS)('%s sobre %s tem pelo menos 3:1', (fg, bg) => {
      const ratio = contrastRatio(resolveToken(tokens[theme], fg), resolveToken(tokens[theme], bg));
      expect(ratio, `${fg} / ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3);
    });
  });

  it('regressão: texto sobre accent no prestador não é branco sobre violeta', () => {
    const p = tokens.PROVIDER;
    expect(resolveToken(p, '--tg-accent')).toBe('#9a80f6');
    expect(resolveToken(p, '--tg-text-on-accent')).toBe('#181625');
  });
});
