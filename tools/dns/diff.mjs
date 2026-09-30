// Compares the live zone with the committed snapshot (D28).
// Usage: CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=… node tools/dns/diff.mjs [--file <baseline.json>]
// Exit 0 = no drift, 1 = drift, 2 = usage or API error.
import { readFile } from 'node:fs/promises';
import { describe, diffRecords, fetchRecords, normalize, readEnv, SNAPSHOT_URL, USAGE } from './lib.mjs';

const args = process.argv.slice(2);
let baselinePath = SNAPSHOT_URL;
if (args.length) {
  if (args[0] !== '--file' || !args[1] || args.length > 2) {
    console.error('diff: usage: node tools/dns/diff.mjs [--file <baseline.json>]');
    process.exit(2);
  }
  baselinePath = args[1];
}

const env = readEnv();
if (!env) {
  console.error(`diff: ${USAGE}`);
  process.exit(2);
}

let baseline;
let live;
try {
  baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  live = normalize(await fetchRecords(env));
} catch (err) {
  console.error(`diff: ${err.message}`);
  process.exit(2);
}

const { added, removed, changed } = diffRecords(baseline, live);
if (!added.length && !removed.length && !changed.length) {
  console.log(`diff: no drift (${live.length} records)`);
  process.exit(0);
}
for (const r of added) console.log(`added:   ${describe(r)}`);
for (const r of removed) console.log(`removed: ${describe(r)}`);
for (const { before, after } of changed) console.log(`changed: ${describe(before)}\n      -> ${describe(after)}`);
console.log(`diff: drift — ${added.length} added, ${removed.length} removed, ${changed.length} changed`);
process.exit(1);
