export function levelFromPoints(totalPoints: number, pointsPerLevel = 5): number {
  const safePpl = Math.max(1, pointsPerLevel);
  const clampedPoints = Math.max(0, totalPoints);
  const rawLevel = Math.floor(clampedPoints / safePpl) + 1;
  return Math.min(20, Math.max(1, rawLevel));
}

export function progressToNext(
  totalPoints: number,
  pointsPerLevel = 5
): { current: number; needed: number; ratio: number } {
  const safePpl = Math.max(1, pointsPerLevel);
  const clampedPoints = Math.max(0, totalPoints);
  const level = levelFromPoints(clampedPoints, safePpl);
  if (level >= 20) {
    return { current: safePpl, needed: safePpl, ratio: 1 };
  }
  const current = clampedPoints % safePpl;
  return {
    current,
    needed: safePpl,
    ratio: current / safePpl,
  };
}

export function needsPrefetch(totalPoints: number, pointsPerLevel = 5): boolean {
  const safePpl = Math.max(1, pointsPerLevel);
  const clampedPoints = Math.max(0, totalPoints);
  const level = levelFromPoints(clampedPoints, safePpl);
  if (level >= 20) return false;
  const remaining = safePpl - (clampedPoints % safePpl);
  return remaining <= 2;
}
