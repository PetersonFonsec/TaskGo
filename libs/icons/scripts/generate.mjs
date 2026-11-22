// Gera src/icons.generated.ts a partir do @phosphor-icons/core (MIT).
// Só os ícones listados aqui entram no build. Para adicionar um ícone,
// inclua o nome (igual ao do Phosphor) e rode: node libs/icons/scripts/generate.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICONS = [
  'arrow-left',
  'arrow-right',
  'bell',
  'calendar-blank',
  'caret-down',
  'caret-right',
  'check',
  'eye',
  'eye-slash',
  'heart',
  'hourglass',
  'house',
  'magnifying-glass',
  'map-pin',
  'plus',
  'question',
  'receipt',
  'sign-out',
  'star',
  'trash',
  'user',
  'user-circle',
  'wallet',
  'warning-circle',
  'wrench',
  'x',
];

const require = createRequire(import.meta.url);
const svg = (weight, file) => require.resolve(`@phosphor-icons/core/assets/${weight}/${file}.svg`);
const inner = (file) =>
  readFileSync(file, 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

const entries = ICONS.map((name) => {
  const regular = inner(svg('regular', name));
  const fill = inner(svg('fill', `${name}-fill`));
  return `  '${name}': {\n    regular: '${regular}',\n    fill: '${fill}',\n  },`;
});

const out = `// Gerado por libs/icons/scripts/generate.mjs a partir do @phosphor-icons/core.
// Não edite à mão.
export const TG_ICONS = {
${entries.join('\n')}
} as const;

export type TgIconName = keyof typeof TG_ICONS;
export type TgIconWeight = 'regular' | 'fill';
`;

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/icons.generated.ts');
writeFileSync(target, out);
console.log(`${ICONS.length} ícones em ${target}`);
