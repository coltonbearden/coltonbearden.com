// Writes dns/records.json from the live zone (D28).
// Usage: CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=… node tools/dns/snapshot.mjs
// Exit 0 = written, 2 = usage or API error.
import { writeFile } from 'node:fs/promises';
import { fetchRecords, normalize, readEnv, serialize, SNAPSHOT_URL, USAGE } from './lib.mjs';

const env = readEnv();
if (!env) {
  console.error(`snapshot: ${USAGE}`);
  process.exit(2);
}

try {
  const records = normalize(await fetchRecords(env));
  await writeFile(SNAPSHOT_URL, serialize(records));
  console.log(`snapshot: ${records.length} records written to dns/records.json`);
} catch (err) {
  console.error(`snapshot: ${err.message}`);
  process.exit(2);
}
