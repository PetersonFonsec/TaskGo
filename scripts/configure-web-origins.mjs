// Run in the release checkout before building. Angular includes the HTML during prerendering.
import { readFile, writeFile } from 'node:fs/promises';

const apps = {
  'landing-page': 'LANDING_PUBLIC_ORIGIN',
  frontend: 'FRONTEND_PUBLIC_ORIGIN',
  backoffice: 'BACKOFFICE_PUBLIC_ORIGIN',
};
const changes = [];
for (const [app, variable] of Object.entries(apps)) {
  const value = process.env[variable];
  if (!value) continue;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || ![url.origin, url.origin + '/'].includes(value)) {
    throw new Error(`${variable} deve conter apenas a origem HTTP(S), sem caminho, parâmetros ou credenciais.`);
  }

  const base = new URL(`../apps/${app}/`, import.meta.url);
  const index = app === 'landing-page' ? 'index.html' : 'src/index.html';
  const html = await readFile(new URL(index, base), 'utf8');
  const oldOrigin = new URL(html.match(/<meta property="og:image" content="([^"]+)"/)[1]).origin;
  for (const name of [index, 'public/robots.txt', 'public/sitemap.xml']) {
    const file = new URL(name, base);
    const source = name === index ? html : await readFile(file, 'utf8');
    const result = source.replaceAll(oldOrigin + '/', url.origin + '/');
    if (result !== source) changes.push([file, result]);
  }
}
if (!Object.values(apps).some((key) => process.env[key])) {
  throw new Error(`Informe ao menos uma origem: ${Object.values(apps).join(', ')}.`);
}
for (const [file, content] of changes) await writeFile(file, content);
