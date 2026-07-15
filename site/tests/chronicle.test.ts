import { describe, expect, it } from 'vitest';
import { byEditionDesc, docNumber } from '../src/utils/chronicle';

describe('byEditionDesc', () => {
  it('sorts newest edition first without mutating input', () => {
    const input = [{ data: { edition: 1 } }, { data: { edition: 3 } }, { data: { edition: 2 } }];
    const out = byEditionDesc(input);
    expect(out.map((e) => e.data.edition)).toEqual([3, 2, 1]);
    expect(input.map((e) => e.data.edition)).toEqual([1, 3, 2]);
  });
});

describe('docNumber', () => {
  it('zero-pads to three digits', () => {
    expect(docNumber(1)).toBe('FC-CHRON-001');
    expect(docNumber(42)).toBe('FC-CHRON-042');
    expect(docNumber(120)).toBe('FC-CHRON-120');
  });
});
