export interface EditionLike { data: { edition: number } }

export function byEditionDesc<T extends EditionLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.edition - a.data.edition);
}

export function assertUniqueEditions<T extends EditionLike>(entries: T[]): T[] {
  const seen = new Set<number>();
  const dupes = new Set<number>();
  for (const e of entries) {
    if (seen.has(e.data.edition)) dupes.add(e.data.edition);
    seen.add(e.data.edition);
  }
  if (dupes.size) {
    throw new Error(`Duplicate post edition(s): ${[...dupes].sort((a, b) => a - b).join(', ')}`);
  }
  return entries;
}
