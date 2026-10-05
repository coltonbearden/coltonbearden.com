import { describe, expect, it } from 'vitest';
import featured from '../src/data/catalog.json';
import snapshot from '../src/data/repos.json';
import { featuredRepos, repoMeta, type Repo } from '../src/utils/catalog';

const repo = (full_name: string, over: Partial<Repo> = {}): Repo => ({
  full_name,
  html_url: `https://github.com/${full_name}`,
  description: 'A repo',
  language: 'TypeScript',
  stargazers_count: 0,
  pushed_at: '2026-01-02T03:04:05Z',
  topics: [],
  archived: false,
  fork: false,
  ...over,
});

describe('featuredRepos', () => {
  it('returns snapshot entries in the curated order', () => {
    const repos = [repo('octo/a'), repo('octo/b'), repo('octo/c')];
    expect(featuredRepos(['octo/c', 'octo/a'], repos).map((r) => r.full_name)).toEqual(['octo/c', 'octo/a']);
  });

  it('throws naming every featured repo the snapshot lacks', () => {
    expect(() => featuredRepos(['octo/a', 'octo/x', 'octo/y'], [repo('octo/a')])).toThrow(
      'Featured repo(s) missing from repos.json: octo/x, octo/y',
    );
  });

  it('resolves the committed list against the committed snapshot', () => {
    expect(featuredRepos(featured, snapshot).map((r) => r.full_name)).toEqual(featured);
  });
});

describe('repoMeta', () => {
  it('shows language and the push date, and stars only when there are any', () => {
    expect(repoMeta(repo('octo/a'))).toBe('TypeScript · updated 2026-01-02');
    expect(repoMeta(repo('octo/a', { stargazers_count: 1 }))).toBe('TypeScript · 1 star · updated 2026-01-02');
    expect(repoMeta(repo('octo/a', { stargazers_count: 2, language: null }))).toBe('2 stars · updated 2026-01-02');
  });
});
