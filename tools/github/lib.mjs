// Shared helpers for the repo-catalog snapshot tool (D32). Zero dependencies; Node >= 22.
//
// site/src/data/catalog.json is the curated list; site/src/data/repos.json is the committed
// snapshot of what /work/ renders for each entry. The site never calls GitHub at build time.
export const API = 'https://api.github.com';
export const CATALOG_URL = new URL('../../site/src/data/catalog.json', import.meta.url);
export const SNAPSHOT_URL = new URL('../../site/src/data/repos.json', import.meta.url);

const FULL_NAME = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

export function parseCatalog(text) {
  let list;
  try {
    list = JSON.parse(text);
  } catch {
    throw new Error('catalog.json is not valid JSON');
  }
  if (!Array.isArray(list) || !list.every((n) => typeof n === 'string' && FULL_NAME.test(n))) {
    throw new Error('catalog.json must be an array of "owner/name" strings');
  }
  const dupes = list.filter((n, i) => list.indexOf(n) !== i);
  if (dupes.length) throw new Error(`catalog.json lists a repo twice: ${[...new Set(dupes)].join(', ')}`);
  return list;
}

export function normalize(repo) {
  return {
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description ?? null,
    language: repo.language ?? null,
    stargazers_count: repo.stargazers_count,
    pushed_at: repo.pushed_at,
    topics: [...(repo.topics ?? [])].sort(),
    archived: repo.archived,
    fork: repo.fork,
  };
}

// Why a listed repo can't go in the catalog, or null. A renamed repo still answers 200 under its
// old name, so the name GitHub returns has to match the one listed.
export function refusal(repo, listedAs) {
  if (repo.full_name !== listedAs) return `GitHub calls it ${repo.full_name}; update catalog.json`;
  if (repo.private) return 'private';
  if (repo.fork) return 'a fork';
  if (repo.archived) return 'archived';
  return null;
}

export function sortByFullName(repos) {
  return [...repos].sort((a, b) => (a.full_name < b.full_name ? -1 : a.full_name > b.full_name ? 1 : 0));
}

export function serialize(repos) {
  return `${JSON.stringify(repos, null, 2)}\n`;
}

// Errors carry the repo name, the HTTP status and GitHub's message only — never the token or request headers.
export async function fetchRepo(fullName, token, fetchImpl = fetch) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'coltonbearden.com-refresh-catalog',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(`${API}/repos/${fullName}`, { headers });
  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`${fullName}: GitHub API returned HTTP ${res.status} with a non-JSON body`);
  }
  if (res.status !== 200) {
    throw new Error(`${fullName}: GitHub API returned HTTP ${res.status}${body?.message ? ` (${body.message})` : ''}`);
  }
  return body;
}
