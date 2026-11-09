export const MIN_LEVEL = 1;
export const MAX_LEVEL = 20;
export const DEFAULT_POINTS_PER_LEVEL = 5;

/**
 * Pure level calculation from totalPoints and pointsPerLevel (Rule 5).
 * Clamps totalPoints at floor 0 and level in [1, 20].
 */
export function levelFromPoints(
  totalPoints: number,
  pointsPerLevel: number = DEFAULT_POINTS_PER_LEVEL
): number {
  const safePpl = Math.max(1, Math.min(50, Math.floor(pointsPerLevel)));
  const clampedPoints = Math.max(0, Math.floor(totalPoints));
  const rawLevel = Math.floor(clampedPoints / safePpl) + 1;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, rawLevel));
}

export interface LevelProgress {
  current: number;
  needed: number;
  ratio: number;
}

/**
 * Progress within current level toward next level.
 * At level 20 (max), ratio is always 1.
 */
export function progressToNext(
  totalPoints: number,
  pointsPerLevel: number = DEFAULT_POINTS_PER_LEVEL
): LevelProgress {
  const safePpl = Math.max(1, Math.min(50, Math.floor(pointsPerLevel)));
  const clampedPoints = Math.max(0, Math.floor(totalPoints));
  const level = levelFromPoints(clampedPoints, safePpl);
  if (level >= MAX_LEVEL) {
    return { current: safePpl, needed: safePpl, ratio: 1 };
  }
  const current = clampedPoints % safePpl;
  return {
    current,
    needed: safePpl,
    ratio: current / safePpl,
  };
}

/**
 * Returns true if student is below level 20 and needs <= 2 points to reach level + 1.
 */
export function needsPrefetch(
  totalPoints: number,
  pointsPerLevel: number = DEFAULT_POINTS_PER_LEVEL
): boolean {
  const safePpl = Math.max(1, Math.min(50, Math.floor(pointsPerLevel)));
  const clampedPoints = Math.max(0, Math.floor(totalPoints));
  const level = levelFromPoints(clampedPoints, safePpl);
  if (level >= MAX_LEVEL) return false;
  const remaining = safePpl - (clampedPoints % safePpl);
  return remaining <= 2;
}

export interface WonderProgressInfo {
  totalPoints: number;
  targetPoints: number;
  ratio: number;
  percent: number;
  stage: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Computes Class Wonder progress and growth stage (1..6) from total class points.
 * Default target = studentCount * pointsPerLevel * 5 (e.g. 36 * 5 * 5 = 900).
 */
export function calculateWonderProgress(
  totalClassPoints: number,
  studentCount = 36,
  pointsPerLevel: number = DEFAULT_POINTS_PER_LEVEL
): WonderProgressInfo {
  const safePpl = Math.max(1, Math.min(50, Math.floor(pointsPerLevel)));
  const safeCount = Math.max(1, studentCount);
  const targetPoints = safeCount * safePpl * 5;
  const clamped = Math.max(0, totalClassPoints);
  const ratio = Math.min(1, clamped / targetPoints);
  const percent = Math.round(ratio * 100);

  let stage: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  if (ratio >= 1) stage = 6;
  else if (ratio >= 0.8) stage = 5;
  else if (ratio >= 0.6) stage = 4;
  else if (ratio >= 0.4) stage = 3;
  else if (ratio >= 0.2) stage = 2;

  return {
    totalPoints: clamped,
    targetPoints,
    ratio,
    percent,
    stage,
  };
}
