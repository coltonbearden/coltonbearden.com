export interface EditionLike { data: { edition: number } }

export function byEditionDesc<T extends EditionLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.edition - a.data.edition);
}

export function docNumber(edition: number): string {
  return `FC-CHRON-${String(edition).padStart(3, '0')}`;
}
