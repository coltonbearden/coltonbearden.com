import { describe, expect, it } from 'vitest';
import { assertUniqueEditions, byEditionDesc } from '../src/utils/posts';

describe('byEditionDesc', () => {
  it('sorts newest edition first without mutating input', () => {
    const input = [{ data: { edition: 1 } }, { data: { edition: 3 } }, { data: { edition: 2 } }];
    const out = byEditionDesc(input);
    expect(out.map((e) => e.data.edition)).toEqual([3, 2, 1]);
    expect(input.map((e) => e.data.edition)).toEqual([1, 3, 2]);
  });
});

describe('assertUniqueEditions', () => {
  it('throws on a duplicate edition and passes unique ones through', () => {
    const editions = (...ns: number[]) => ns.map((edition) => ({ data: { edition } }));
    expect(() => assertUniqueEditions(editions(1, 2, 2))).toThrow('Duplicate post edition(s): 2');
    const unique = editions(1, 2, 3);
    expect(assertUniqueEditions(unique)).toBe(unique);
  });
});
