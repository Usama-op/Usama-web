#!/usr/bin/env node
/* Usage: node scripts/check-links.mjs        (Node 18+, no dependencies)
   Checks every local file/image/anchor the site references and every external link
   (project demos, GitHub repos, social links). Run it from any machine with internet access. */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const html = read('index.html'), css = read('css/style.css'), projects = read('js/projects.js'), main = read('js/main.js');
let failed = 0;
const report = (ok, label, detail = '') => { if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`); };

/* 1. local files */
const resume = main.match(/resumePath:\s*'([^']+)'/)?.[1];
const locals = new Set();
for (const m of html.matchAll(/(?:src|href|srcset|imagesrcset)="([^"]+)"/g))
  for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u && !/^(https?:|mailto:|tel:|#|data:|__SITE_URL__)/.test(u)) locals.add(u.split('#')[0]); }
for (const m of css.matchAll(/url\("?([^")]+)"?\)/g)) if (!/^data:/.test(m[1])) locals.add('css/' + m[1]);
for (const m of projects.matchAll(/src:\s*'([^']+)'/g)) locals.add(m[1]);
for (const f of [...locals].sort()) {
  if (f === resume) continue; // reported separately below: a missing PDF is a note, not a failure
  const p = join(root, f.startsWith('css/../') ? f.replace('css/../', '') : f);
  report(existsSync(p), 'file  ' + f);
}
if (resume) console.log(existsSync(join(root, resume)) ? `ok   resume ${resume}` : `NOTE resume PDF not found at ${resume} (the Resume section will show "Request my resume" until you add it)`);

/* 2. in-page anchors */
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const a of new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))) report(ids.has(a), 'anchor #' + a);

/* 3. external links */
const urls = new Set([...html.matchAll(/(?:href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]));
for (const m of projects.matchAll(/(?:live|github):\s*'(https?:\/\/[^']+)'/g)) urls.add(m[1]);
for (const u of [...urls].sort()) {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(u, { redirect: 'follow', signal: c.signal, headers: { 'User-Agent': 'portfolio-link-check' } });
    clearTimeout(t);
    report(r.ok, `link  ${u}`, `HTTP ${r.status}`);
  } catch (e) { report(false, `link  ${u}`, e.name === 'AbortError' ? 'timed out' : String(e.cause?.code || e.message)); }
}
console.log(failed ? `\n${failed} problem(s) found.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
