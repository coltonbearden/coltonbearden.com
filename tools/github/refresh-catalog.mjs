// Rewrites site/src/data/repos.json from GitHub for the repos listed in site/src/data/catalog.json (D32).
// Usage: node tools/github/refresh-catalog.mjs   (GITHUB_TOKEN is optional and never printed)
// Exit 0 = written, 1 = a listed repo could not be used (each one is named), 2 = bad catalog.json.
import { readFile, writeFile } from 'node:fs/promises';
import { CATALOG_URL, fetchRepo, normalize, parseCatalog, refusal, serialize, SNAPSHOT_URL, sortByFullName } from './lib.mjs';

let featured;
try {
  featured = parseCatalog(await readFile(CATALOG_URL, 'utf8'));
} catch (err) {
  console.error(`refresh-catalog: ${err.message}`);
  process.exit(2);
}

const token = process.env.GITHUB_TOKEN || undefined;
const repos = [];
const problems = [];
for (const fullName of featured) {
  try {
    const repo = await fetchRepo(fullName, token);
    const why = refusal(repo, fullName);
    if (why) problems.push(`${fullName}: ${why}`);
    else repos.push(normalize(repo));
  } catch (err) {
    problems.push(err.message);
  }
}

if (problems.length) {
  console.error(`refresh-catalog: ${problems.length} repo(s) could not be used; repos.json not written:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

await writeFile(SNAPSHOT_URL, serialize(sortByFullName(repos)));
console.log(`refresh-catalog: ${repos.length} repos written to site/src/data/repos.json`);
