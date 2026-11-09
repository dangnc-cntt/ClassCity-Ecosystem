import type { Lot } from '../config/cityLayout';

/**
 * Finds the nearest lot to (x, z) based on its road parkingPoint, optionally within `maxRadius`.
 */
export function findNearestLot(
  lots: readonly Lot[],
  x: number,
  z: number,
  maxRadius = Number.POSITIVE_INFINITY
): Lot | null {
  let best: Lot | null = null;
  let bestDistSq = maxRadius * maxRadius;

  for (const lot of lots) {
    const dx = lot.parkingPoint[0] - x;
    const dz = lot.parkingPoint[1] - z;
    const distSq = dx * dx + dz * dz;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = lot;
    }
  }
  return best;
}

/**
 * Groups lots by their roadWaypointId.
 */
export function lotsByWaypoint(lots: readonly Lot[]): Record<string, Lot[]> {
  const map: Record<string, Lot[]> = {};
  for (const lot of lots) {
    const list = map[lot.roadWaypointId] ?? [];
    list.push(lot);
    map[lot.roadWaypointId] = list;
  }
  return map;
}

export interface LeaderboardSortableStudent {
  id: string;
  studentCode: number;
  name: string;
  totalPoints: number;
  level: number;
  shopBranch: string;
}

/**
 * Returns students sorted by totalPoints descending, breaking ties by studentCode ascending.
 */
export function selectLeaderboard<T extends LeaderboardSortableStudent>(
  students: readonly T[],
  limit?: number
): T[] {
  const sorted = [...students].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.studentCode - b.studentCode;
  });
  return limit !== undefined ? sorted.slice(0, limit) : sorted;
}

export interface StudentFilterCriteria {
  query?: string;
  branch?: string | 'all';
  minLevel?: number;
  maxLevel?: number;
}

/**
 * Filters students by search query (matches name or studentCode), shopBranch, and level range.
 */
export function filterStudents<T extends LeaderboardSortableStudent>(
  students: readonly T[],
  criteria: StudentFilterCriteria
): T[] {
  const q = (criteria.query ?? '').trim().toLowerCase();
  const branch = criteria.branch ?? 'all';
  const minLevel = criteria.minLevel ?? 1;
  const maxLevel = criteria.maxLevel ?? 20;

  return students.filter((s) => {
    if (branch !== 'all' && s.shopBranch !== branch) {
      return false;
    }
    if (s.level < minLevel || s.level > maxLevel) {
      return false;
    }
    if (q.length > 0) {
      const codeMatch = String(s.studentCode) === q || `#${s.studentCode}` === q;
      const nameMatch = s.name.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch) {
        return false;
      }
    }
    return true;
  });
}
