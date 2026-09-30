// Run: node --test tools/dns/lib.test.mjs (also runs in CI, build-and-audit).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { diffRecords, fetchRecords, normalize, readEnv, REDACTED, serialize } from './lib.mjs';

const ZONE = '0123456789abcdef0123456789abcdef';
const raw = [
  { id: 'b', type: 'TXT', name: 'x.example.com', content: 'v=1', ttl: 1, proxied: false, comment: 'private note', tags: ['t'], meta: {}, created_on: '2026-01-01' },
  { id: 'a', type: 'AAAA', name: 'example.com', content: '2001:db8::1', ttl: 1, proxied: true },
  { id: 'c', type: 'MX', name: 'example.com', content: 'mx2.example.net', ttl: 1, proxied: false, priority: 20 },
  { id: 'd', type: 'MX', name: 'example.com', content: 'mx1.example.net', ttl: 1, proxied: false, priority: 10 },
];

describe('normalize', () => {
  it('keeps only snapshot fields, redacts proxied content and keeps priority', () => {
    const out = normalize(raw);
    for (const r of out) {
      assert.deepEqual(Object.keys(r).filter((k) => !['id', 'type', 'name', 'content', 'ttl', 'proxied', 'priority'].includes(k)), []);
    }
    assert.equal(out.find((r) => r.id === 'a').content, REDACTED);
    assert.equal(out.find((r) => r.id === 'd').priority, 10);
    assert.equal('priority' in out.find((r) => r.id === 'b'), false);
    assert.equal(serialize(out).includes('private note'), false);
    assert.equal(serialize(out).includes('2001:db8::1'), false);
  });

  it('sorts by type, name, content, id regardless of input order', () => {
    const ids = normalize(raw).map((r) => r.id);
    assert.deepEqual(ids, ['a', 'd', 'c', 'b']);
    assert.deepEqual(normalize([...raw].reverse()).map((r) => r.id), ids);
  });

  it('serializes with a trailing newline', () => {
    assert.ok(serialize(normalize(raw)).endsWith(']\n'));
  });
});

describe('diffRecords', () => {
  const base = normalize(raw);
  it('reports no drift for identical sets', () => {
    assert.deepEqual(diffRecords(base, normalize([...raw].reverse())), { added: [], removed: [], changed: [] });
  });
  it('reports added, removed and changed records by id', () => {
    const live = base.filter((r) => r.id !== 'b').map((r) => (r.id === 'c' ? { ...r, ttl: 300 } : r));
    live.push({ id: 'e', type: 'TXT', name: 'new.example.com', content: 'x', ttl: 1, proxied: false });
    const d = diffRecords(base, live);
    assert.deepEqual(d.added.map((r) => r.id), ['e']);
    assert.deepEqual(d.removed.map((r) => r.id), ['b']);
    assert.deepEqual(d.changed.map((c) => [c.before.ttl, c.after.ttl]), [[1, 300]]);
  });
});

describe('readEnv', () => {
  it('requires a token and a 32-hex zone id', () => {
    assert.equal(readEnv({}), null);
    assert.equal(readEnv({ CLOUDFLARE_API_TOKEN: 't' }), null);
    assert.equal(readEnv({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: '../x' }), null);
    assert.deepEqual(readEnv({ CLOUDFLARE_API_TOKEN: 't', CLOUDFLARE_ZONE_ID: ZONE }), { token: 't', zone: ZONE });
  });
});

describe('fetchRecords', () => {
  const page = (n, total, result) => ({ ok: true, status: 200, json: async () => ({ success: true, result, result_info: { page: n, total_pages: total } }) });
  it('follows pagination', async () => {
    const seen = [];
    const fake = async (url) => {
      const n = Number(new URL(url).searchParams.get('page'));
      seen.push(n);
      return page(n, 2, [{ id: String(n) }]);
    };
    assert.deepEqual((await fetchRecords({ token: 'secret-token', zone: ZONE }, fake)).map((r) => r.id), ['1', '2']);
    assert.deepEqual(seen, [1, 2]);
  });
  it('reports API errors without the token', async () => {
    const fake = async () => ({ ok: false, status: 403, json: async () => ({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }) });
    await assert.rejects(fetchRecords({ token: 'secret-token', zone: ZONE }, fake), (err) => {
      assert.match(err.message, /10000: Authentication error/);
      assert.equal(err.message.includes('secret-token'), false);
      return true;
    });
  });
});

describe('CLI without credentials', () => {
  for (const script of ['snapshot.mjs', 'diff.mjs']) {
    it(`${script} exits 2 and makes no request`, () => {
      const path = fileURLToPath(new URL(script, import.meta.url));
      const run = spawnSync(process.execPath, [path], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
      assert.equal(run.status, 2);
      assert.match(run.stderr, /CLOUDFLARE_API_TOKEN/);
    });
  }
});
