// The repo catalog on /work/. src/data/catalog.json is the curated list: edit it, then run
// `node tools/github/refresh-catalog.mjs` from the repo root and commit src/data/repos.json.
export interface Repo {
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
  archived: boolean;
  fork: boolean;
}

export function featuredRepos(featured: string[], repos: Repo[]): Repo[] {
  const byName = new Map(repos.map((r) => [r.full_name, r]));
  const out: Repo[] = [];
  const missing: string[] = [];
  for (const name of featured) {
    const repo = byName.get(name);
    if (repo) out.push(repo);
    else missing.push(name);
  }
  if (missing.length) {
    throw new Error(`Featured repo(s) missing from repos.json: ${missing.join(', ')}`);
  }
  return out;
}

export function repoMeta(repo: Repo): string {
  const stars = repo.stargazers_count;
  return [
    repo.language,
    stars > 0 ? `${stars} ${stars === 1 ? 'star' : 'stars'}` : null,
    `updated ${repo.pushed_at.slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join(' · ');
}
