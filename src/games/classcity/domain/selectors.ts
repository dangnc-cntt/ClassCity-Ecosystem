import type { Lot } from '../config/cityLayout';

export function findNearestLot(lots: readonly Lot[], x: number, z: number): Lot | null {
  let best: Lot | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;
  for (const lot of lots) {
    const dx = lot.parkingPoint[0] - x;
    const dz = lot.parkingPoint[1] - z;
    const distSq = dx * dx + dz * dz;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = lot;
    }
  }
  return best;
}
