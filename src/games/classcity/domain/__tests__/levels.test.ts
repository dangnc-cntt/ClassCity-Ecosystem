import { describe, expect, it } from 'vitest';
import { levelFromPoints, needsPrefetch, progressToNext } from '../levels';

describe('domain/levels smoke tests', () => {
  it('computes level 1 for 0 points and clamps at 20', () => {
    expect(levelFromPoints(0, 5)).toBe(1);
    expect(levelFromPoints(4, 5)).toBe(1);
    expect(levelFromPoints(5, 5)).toBe(2);
    expect(levelFromPoints(95, 5)).toBe(20);
    expect(levelFromPoints(200, 5)).toBe(20);
  });

  it('computes progress ratio and prefetch threshold', () => {
    expect(progressToNext(3, 5)).toEqual({ current: 3, needed: 5, ratio: 0.6 });
    expect(needsPrefetch(2, 5)).toBe(false);
    expect(needsPrefetch(3, 5)).toBe(true);
    expect(needsPrefetch(95, 5)).toBe(false);
  });
});
