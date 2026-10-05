// Run: node --test tools/github/lib.test.mjs (also runs in CI, build-and-audit).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchRepo, normalize, parseCatalog, refusal, serialize, sortByFullName } from './lib.mjs';

const raw = {
  id: 1,
  full_name: 'octo/widget',
  html_url: 'https://github.com/octo/widget',
  description: 'A widget',
  language: 'TypeScript',
  stargazers_count: 3,
  pushed_at: '2026-01-02T03:04:05Z',
  topics: ['zeta', 'alpha'],
  archived: false,
  fork: false,
  private: false,
  owner: { login: 'octo', email: 'private@example.com' },
  permissions: { admin: true },
};

describe('parseCatalog', () => {
  it('returns the list in file order', () => {
    assert.deepEqual(parseCatalog('["octo/b", "octo/a.b_c-d"]'), ['octo/b', 'octo/a.b_c-d']);
  });
  it('rejects bad JSON, a non-array, a malformed name and a duplicate', () => {
    assert.throws(() => parseCatalog('['), /not valid JSON/);
    assert.throws(() => parseCatalog('{"featured": []}'), /array of "owner\/name"/);
    assert.throws(() => parseCatalog('["octo/a", "../etc/passwd"]'), /array of "owner\/name"/);
    assert.throws(() => parseCatalog('["octo/a", "octo/a"]'), /twice: octo\/a/);
  });
});

describe('normalize', () => {
  it('keeps only the snapshot fields and sorts topics', () => {
    const out = normalize(raw);
    assert.deepEqual(Object.keys(out), ['full_name', 'html_url', 'description', 'language', 'stargazers_count', 'pushed_at', 'topics', 'archived', 'fork']);
    assert.deepEqual(out.topics, ['alpha', 'zeta']);
    assert.equal(serialize([out]).includes('private@example.com'), false);
  });
  it('turns a missing description, language and topics into null, null and []', () => {
    const out = normalize({ ...raw, description: undefined, language: null, topics: undefined });
    assert.equal(out.description, null);
    assert.equal(out.language, null);
    assert.deepEqual(out.topics, []);
  });
});

describe('sortByFullName and serialize', () => {
  const repos = ['octo/b', 'octo/a', 'acme/z'].map((full_name) => normalize({ ...raw, full_name }));
  it('sorts by full name regardless of input order, without mutating the input', () => {
    assert.deepEqual(sortByFullName(repos).map((r) => r.full_name), ['acme/z', 'octo/a', 'octo/b']);
    assert.deepEqual(sortByFullName([...repos].reverse()).map((r) => r.full_name), ['acme/z', 'octo/a', 'octo/b']);
    assert.deepEqual(repos.map((r) => r.full_name), ['octo/b', 'octo/a', 'acme/z']);
  });
  it('serializes with a trailing newline', () => {
    assert.ok(serialize(sortByFullName(repos)).endsWith(']\n'));
  });
});

describe('refusal', () => {
  it('accepts a public, original, live repo under the listed name', () => {
    assert.equal(refusal(raw, 'octo/widget'), null);
  });
  it('refuses private, forked and archived repos', () => {
    assert.equal(refusal({ ...raw, private: true }, 'octo/widget'), 'private');
    assert.equal(refusal({ ...raw, fork: true }, 'octo/widget'), 'a fork');
    assert.equal(refusal({ ...raw, archived: true }, 'octo/widget'), 'archived');
  });
  it('refuses a repo GitHub now knows under another name', () => {
    assert.match(refusal({ ...raw, full_name: 'octo/gadget' }, 'octo/widget'), /octo\/gadget; update catalog\.json/);
  });
});

describe('fetchRepo', () => {
  const ok = (body) => ({ status: 200, json: async () => body });
  it('requests the repo and sends Authorization only when a token is given', async () => {
    const seen = [];
    const fake = async (url, init) => {
      seen.push({ url, auth: init.headers.Authorization });
      return ok(raw);
    };
    assert.equal((await fetchRepo('octo/widget', undefined, fake)).full_name, 'octo/widget');
    await fetchRepo('octo/widget', 'secret-token', fake);
    assert.deepEqual(seen, [
      { url: 'https://api.github.com/repos/octo/widget', auth: undefined },
      { url: 'https://api.github.com/repos/octo/widget', auth: 'Bearer secret-token' },
    ]);
  });
  it('names the repo and the status on a non-200, without the token', async () => {
    const fake = async () => ({ status: 404, json: async () => ({ message: 'Not Found' }) });
    await assert.rejects(fetchRepo('octo/widget', 'secret-token', fake), (err) => {
      assert.match(err.message, /^octo\/widget: GitHub API returned HTTP 404 \(Not Found\)$/);
      assert.equal(err.message.includes('secret-token'), false);
      return true;
    });
  });
  it('reports a non-JSON body', async () => {
    const fake = async () => ({ status: 502, json: async () => { throw new SyntaxError('bad'); } });
    await assert.rejects(fetchRepo('octo/widget', undefined, fake), /octo\/widget: GitHub API returned HTTP 502 with a non-JSON body/);
  });
});
