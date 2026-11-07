#!/usr/bin/env node
/* Usage: node scripts/set-site-url.mjs https://your-site.example/
   Replaces the __SITE_URL__ placeholder in index.html, robots.txt and sitemap.xml
   (canonical link, social preview tags, sitemap). Run once after you know your live URL. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = process.argv[2];
if (!arg || !/^https?:\/\/[^\s]+$/.test(arg)) {
  console.error('Usage: node scripts/set-site-url.mjs https://your-site.example/');
  process.exit(1);
}
const url = arg.endsWith('/') ? arg : arg + '/';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let total = 0;
for (const f of ['index.html', 'robots.txt', 'sitemap.xml']) {
  const p = join(root, f);
  if (!existsSync(p)) continue;
  const before = readFileSync(p, 'utf8');
  const n = before.split('__SITE_URL__').length - 1;
  if (n) { writeFileSync(p, before.replaceAll('__SITE_URL__', url)); console.log(`${f}: ${n} replaced`); total += n; }
}
console.log(total ? `Done. Site URL set to ${url}` : 'Nothing to replace (already set?).');
