// Shared helpers for the DNS snapshot tools (D28). Zero dependencies; Node >= 22.
//
// The committed snapshot keeps only what a drift check needs and what is safe in a public repo:
// record comments and tags are private Cloudflare metadata and are dropped, and a proxied record's
// content (its hidden origin) is replaced with REDACTED.
export const API = 'https://api.cloudflare.com/client/v4';
export const REDACTED = '<proxied>';
export const SNAPSHOT_URL = new URL('../../dns/records.json', import.meta.url);
export const USAGE =
  'Set CLOUDFLARE_API_TOKEN (DNS read) and CLOUDFLARE_ZONE_ID (32 hex characters) in the environment.';

const SORT_KEYS = ['type', 'name', 'content', 'id'];

export function readEnv(env = process.env) {
  const token = env.CLOUDFLARE_API_TOKEN;
  const zone = env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone || !/^[0-9a-f]{32}$/.test(zone)) return null;
  return { token, zone };
}

export function normalize(records) {
  return records
    .map((r) => {
      const out = {
        id: r.id,
        type: r.type,
        name: r.name,
        content: r.proxied ? REDACTED : r.content,
        ttl: r.ttl,
        proxied: r.proxied,
      };
      if (r.priority !== undefined && r.priority !== null) out.priority = r.priority;
      return out;
    })
    .sort((a, b) => {
      for (const k of SORT_KEYS) {
        if (a[k] < b[k]) return -1;
        if (a[k] > b[k]) return 1;
      }
      return 0;
    });
}

export function serialize(records) {
  return `${JSON.stringify(records, null, 2)}\n`;
}

function canonical(record) {
  return JSON.stringify(Object.fromEntries(Object.entries(record).sort(([a], [b]) => (a < b ? -1 : 1))));
}

// Records are matched by id: a deleted and re-created record shows as removed + added.
export function diffRecords(baseline, live) {
  const before = new Map(baseline.map((r) => [r.id, r]));
  const after = new Map(live.map((r) => [r.id, r]));
  const added = live.filter((r) => !before.has(r.id));
  const removed = baseline.filter((r) => !after.has(r.id));
  const changed = [];
  for (const [id, r] of after) {
    const old = before.get(id);
    if (old && canonical(old) !== canonical(r)) changed.push({ before: old, after: r });
  }
  return { added, removed, changed };
}

export function describe(r) {
  const priority = r.priority === undefined ? '' : ` ${r.priority}`;
  return `${r.type} ${r.name}${priority} ${r.content} (ttl ${r.ttl}, id ${r.id})`;
}

// Errors carry Cloudflare's codes and messages only — never the token or request headers.
export async function fetchRecords({ token, zone }, fetchImpl = fetch) {
  const all = [];
  for (let page = 1; ; page++) {
    const res = await fetchImpl(`${API}/zones/${zone}/dns_records?per_page=500&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let body;
    try {
      body = await res.json();
    } catch {
      throw new Error(`Cloudflare API returned HTTP ${res.status} with a non-JSON body`);
    }
    if (!res.ok || !body.success) {
      const errors = (body.errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
      throw new Error(`Cloudflare API error (HTTP ${res.status}): ${errors || 'no error detail'}`);
    }
    all.push(...body.result);
    if (page >= (body.result_info?.total_pages ?? 1)) break;
  }
  return all;
}
