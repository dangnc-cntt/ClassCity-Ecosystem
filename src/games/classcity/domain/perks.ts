import type { WaypointGraph } from '../config/cityLayout';

export type PerkKind = 'double_points' | 'ask_help' | 'lucky_point';

export const PERK_KINDS: readonly PerkKind[] = [
  'double_points',
  'ask_help',
  'lucky_point',
];

export interface PerkCardItem {
  id: string;
  kind: PerkKind;
  acquiredAt: string;
  usedAt?: string;
}

export interface GiftBoxSpot {
  id: string;
  waypointId: string;
  position: [number, number];
  active: boolean;
  respawnAtMs?: number;
}

export const GIFT_BOX_RESPAWN_MS = 20_000;
export const GIFT_BOX_COLLISION_RADIUS = 2.4;

export function pickRandomPerk(rng: () => number): PerkKind {
  const idx = Math.min(
    PERK_KINDS.length - 1,
    Math.max(0, Math.floor(rng() * PERK_KINDS.length))
  );
  return PERK_KINDS[idx] ?? 'lucky_point';
}

/**
 * Spawns `count` (2..3) gift boxes on distinct road waypoints using a deterministic RNG.
 */
export function spawnGiftBoxes(
  graph: WaypointGraph,
  count: number,
  rng: () => number
): GiftBoxSpot[] {
  const candidates = graph.ringOrder.filter((id) => Boolean(graph.nodes[id]));
  if (candidates.length === 0) return [];

  const desired = Math.min(candidates.length, Math.max(1, count));
  const pool = [...candidates];
  const result: GiftBoxSpot[] = [];

  for (let i = 0; i < desired; i += 1) {
    const pickIdx = Math.floor(rng() * pool.length);
    const waypointId = pool.splice(pickIdx, 1)[0];
    if (!waypointId) continue;
    const coords = graph.nodes[waypointId];
    if (!coords) continue;
    result.push({
      id: `gift-${i + 1}`,
      waypointId,
      position: [coords[0], coords[1]],
      active: true,
    });
  }

  return result;
}

/**
 * 2D distance collision check between vehicle (x, z) and active gift boxes.
 */
export function checkGiftBoxCollision(
  vehicleX: number,
  vehicleZ: number,
  boxes: readonly GiftBoxSpot[],
  radius: number = GIFT_BOX_COLLISION_RADIUS
): GiftBoxSpot | null {
  const rSq = radius * radius;
  for (const box of boxes) {
    if (!box.active) continue;
    const dx = box.position[0] - vehicleX;
    const dz = box.position[1] - vehicleZ;
    if (dx * dx + dz * dz <= rSq) {
      return box;
    }
  }
  return null;
}

/**
 * Consumes an unused `double_points` perk card if requested and delta > 0.
 */
export function consumeDoublePointsPerk(
  delta: number,
  perks: readonly PerkCardItem[],
  nowIso: string
): { effectiveDelta: number; updatedPerks: PerkCardItem[]; consumedPerkId: string | null } {
  if (delta <= 0) {
    return {
      effectiveDelta: delta,
      updatedPerks: [...perks],
      consumedPerkId: null,
    };
  }

  const unusedIdx = perks.findIndex(
    (p) => p.kind === 'double_points' && !p.usedAt
  );
  if (unusedIdx < 0) {
    return {
      effectiveDelta: delta,
      updatedPerks: [...perks],
      consumedPerkId: null,
    };
  }

  const updatedPerks = perks.map((p, idx) =>
    idx === unusedIdx ? { ...p, usedAt: nowIso } : p
  );

  return {
    effectiveDelta: delta * 2,
    updatedPerks,
    consumedPerkId: perks[unusedIdx]?.id ?? null,
  };
}
