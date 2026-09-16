const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const backendRequire = createRequire(path.resolve(__dirname, '../../apps/backend/package.json'));
backendRequire('dotenv').config({ path: path.resolve(__dirname, '../../apps/backend/.env'), quiet: true });
const { PrismaClient } = backendRequire('@prisma/client');
const db = new PrismaClient();
const originals = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories-before.json')));
const recordPath = path.join(__dirname, 'cloudflare-results.json');
const records = fs.existsSync(recordPath) ? JSON.parse(fs.readFileSync(recordPath)) : [];
const account = process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID || '020e6063e3ac9ce4a76b09dbaa7705ec';
const hash = process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH || 'Bpbv9d8J9NqFhm--zUdxEA';
const variant = process.env.CLOUDFLARE_IMAGES_VARIANT || 'public';
const token = process.env.CLOUDFLARE_IMAGES_API_TOKEN || process.env.CDN_API_TOKEN;
const save = () => fs.writeFileSync(recordPath, JSON.stringify(records, null, 2) + '\n');
async function delivery(url) {
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Delivery check failed: ${response.status}`);
  return response.status;
}
async function main() {
  if (!token) throw new Error('Cloudflare token missing');
  if (process.argv.includes('--verify')) {
    if (records.length !== originals.length) throw new Error('Incomplete upload set');
    for (const entry of records) {
      const category = await db.category.findUniqueOrThrow({ where: { id: BigInt(entry.categoryId) } });
      if (category.thumb !== entry.thumb) throw new Error(`Thumbnail mismatch: ${entry.slug}`);
      await delivery(entry.thumb);
      console.log(`VERIFIED ${entry.slug}: database matches, delivery HTTP 200`);
    }
    console.log(`PASS: ${records.length}/${originals.length} category thumbnails verified.`);
    return;
  }
  for (const category of originals) {
    let entry = records.find(row => row.categoryId === category.id);
    if (!entry) {
      const imageId = `proxi-category-20260915-${category.slug}`;
      const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${account}/images/v1`;
      const form = new FormData();
      form.append('id', imageId);
      form.append('file', new Blob([fs.readFileSync(path.join(__dirname, category.slug + '.png'))], { type: 'image/png' }), category.slug + '.png');
      form.append('requireSignedURLs', 'false');
      form.append('metadata', JSON.stringify({ categoryId: category.id, categorySlug: category.slug, generatedFor: 'TaskGo category thumbnail' }));
      let response = await fetch(baseUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(60000) });
      if (response.status === 409) response = await fetch(`${baseUrl}/${imageId}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok || !result.success || !result.result?.id) throw new Error(`Upload failed for ${category.slug}: HTTP ${response.status}; codes ${(result.errors || []).map(e => e.code).join(',')}`);
      const thumb = `https://imagedelivery.net/${hash}/${result.result.id}/${variant}`;
      if (!result.result.variants?.includes(thumb)) throw new Error(`Missing delivery variant for ${category.slug}`);
      entry = { categoryId: category.id, slug: category.slug, imageId: result.result.id, thumb, previousThumb: category.thumb, uploadedAt: new Date().toISOString() };
      records.push(entry); save();
      console.log(`UPLOADED ${category.slug}`);
    }
    await delivery(entry.thumb);
  }
  await db.$transaction(async tx => {
    for (const entry of records) {
      const original = originals.find(row => row.id === entry.categoryId);
      const current = await tx.category.findUniqueOrThrow({ where: { id: BigInt(entry.categoryId) } });
      if (current.slug !== original.slug || current.name !== original.name || (current.thumb !== original.thumb && current.thumb !== entry.thumb)) throw new Error(`Category changed during generation: ${entry.slug}`);
      await tx.category.update({ where: { id: current.id }, data: { thumb: entry.thumb } });
    }
  });
  console.log(`UPDATED: ${records.length} category thumbnails.`);
}
main().catch(error => { console.error(error.message.replaceAll(token || '__NO_TOKEN__', '[redacted]')); process.exitCode = 1; }).finally(() => db.$disconnect());
