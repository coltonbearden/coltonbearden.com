// Internal link check for the built Surface: every root-relative href/src in dist/**/*.html must
// resolve to a file in dist. Zero dependencies; run after `astro build` (part of `ci:build`).
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');

async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// Candidate files for a root-relative URL path: /x/ → x/index.html, /x.ext → x.ext,
// and a bare /x is accepted as either x.html or x/index.html.
function candidates(urlPath) {
  const rel = urlPath.replace(/^\/+/, '');
  if (urlPath.endsWith('/')) return [path.join(dist, rel, 'index.html')];
  if (path.posix.extname(urlPath)) return [path.join(dist, rel)];
  return [path.join(dist, `${rel}.html`), path.join(dist, rel, 'index.html')];
}

if (!(await stat(dist).catch(() => null))?.isDirectory()) {
  console.error('check-links: dist/ not found — run astro build first');
  process.exit(1);
}

const pages = await htmlFiles(dist);
const missing = [];
let links = 0;

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    // Root-relative only: skips #anchors, mailto:, http(s): and protocol-relative //host URLs.
    if (!raw.startsWith('/') || raw.startsWith('//')) continue;
    let urlPath = raw.split(/[?#]/)[0];
    try {
      urlPath = decodeURIComponent(urlPath);
    } catch {
      // keep the raw path; a malformed escape will simply not resolve
    }
    links++;
    const found = await Promise.all(candidates(urlPath).map(exists));
    if (!found.some(Boolean)) missing.push(`${path.relative(dist, page)} → ${raw}`);
  }
}

if (missing.length) {
  console.error(`check-links: ${missing.length} missing target(s):`);
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}
console.log(`check-links: ${links} internal links across ${pages.length} pages OK`);
