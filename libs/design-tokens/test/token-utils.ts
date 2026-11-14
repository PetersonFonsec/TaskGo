import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const tokensSrc = resolve(repoRoot, 'libs/design-tokens/src');

export type Theme = 'CUSTOMER' | 'PROVIDER';
export type TokenMap = Map<string, string>;

/** Compila SCSS com a lib de tokens no load path e devolve CSS e avisos. */
export function compileScss(source: string, extraLoadPaths: string[] = []) {
  const warnings: string[] = [];
  const result = sass.compileString(source, {
    loadPaths: [tokensSrc, ...extraLoadPaths],
    style: 'expanded',
    logger: {
      warn: (message) => warnings.push(message),
      debug: () => undefined,
    },
  });
  return { css: result.css, warnings };
}

export function compileFile(path: string, loadPaths: string[]) {
  const warnings: string[] = [];
  const result = sass.compile(path, {
    loadPaths,
    style: 'expanded',
    logger: { warn: (message) => warnings.push(message), debug: () => undefined },
  });
  return { css: result.css, warnings };
}

/** Remove blocos @media (com regras aninhadas) para ler só as regras de base. */
function stripMediaBlocks(css: string): string {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf('@media', i);
    if (at === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    let depth = 0;
    let j = css.indexOf('{', at);
    for (; j < css.length; j++) {
      if (css[j] === '{') depth++;
      if (css[j] === '}' && --depth === 0) break;
    }
    i = j + 1;
  }
  return out;
}

/** Declarações de custom properties por seletor, na ordem do CSS. */
export function readRules(css: string): { selector: string; decls: [string, string][] }[] {
  const rules: { selector: string; decls: [string, string][] }[] = [];
  const body = stripMediaBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  for (const match of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1].trim().replace(/["']/g, '');
    const decls: [string, string][] = [];
    for (const decl of match[2].split(';')) {
      const m = decl.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
      if (m) decls.push([m[1], m[2]]);
    }
    rules.push({ selector, decls });
  }
  return rules;
}

/** Tokens efetivos de cada tema: :root e, no prestador, :root[data-theme=PROVIDER] por cima. */
export function themeTokens(css: string, theme: Theme): TokenMap {
  const map: TokenMap = new Map();
  for (const rule of readRules(css)) {
    const applies =
      rule.selector === ':root' ||
      (theme === 'PROVIDER' && rule.selector === ':root[data-theme=PROVIDER]');
    if (applies) for (const [name, value] of rule.decls) map.set(name, value);
  }
  return map;
}

export function resolveToken(tokens: TokenMap, name: string, seen: string[] = []): string {
  if (seen.includes(name)) throw new Error(`Referência circular: ${[...seen, name].join(' -> ')}`);
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Token inexistente: ${name}`);
  const ref = value.match(/^var\((--[\w-]+)\)$/);
  return ref ? resolveToken(tokens, ref[1], [...seen, name]) : value;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.trim().replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Cor hexadecimal inválida: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Luminância relativa sRGB, conforme a definição da WCAG 2.2. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}
