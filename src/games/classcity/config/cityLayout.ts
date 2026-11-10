export const LOT_SIZE = 6;
export const MAX_BUILDING_HEIGHT = 14;
export const GROUND_WIDTH = 130;
export const GROUND_DEPTH = 100;
export const ROAD_WIDTH = 5;
export const WONDER_RADIUS = 7;

/**
 * Checkerboard city plan: every shop faces +Z (toward the park and the default camera),
 * the shop block sits at the back (-Z) and the public park with the Class Wonder fills the front (+Z).
 */
export const COLUMN_X: readonly number[] = [
  -41, -33, -25, -17, -9, 9, 17, 25, 33, 41,
];
export const ROW_Z: readonly number[] = [-36, -22, -8, 6];
/** Centre line of the street that runs in front of each shop row. */
export const ROAD_Z: readonly number[] = ROW_Z.map((z) => z + 7);
/** Vertical streets: two outer boulevards and one central avenue (checkerboard crossings). */
export const ROAD_X: readonly number[] = [-52, 0, 52];
export const ROAD_Z_MIN = -42;
export const ROAD_Z_MAX = (ROAD_Z[ROAD_Z.length - 1] ?? 13) + ROAD_WIDTH / 2;
export const PARK_Z_START = ROAD_Z_MAX + 1;
export const PARK_Z_END = 48;
export const WONDER_CENTER: [number, number, number] = [0, 0, 32];

export interface Lot {
  id: number; // 1..N
  position: [number, number, number];
  rotationY: number;
  roadWaypointId: string;
  parkingPoint: [number, number];
  parkingHeading: number;
  cameraFocus: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
  sidewalkPatrol: {
    a: [number, number];
    b: [number, number];
  };
}

export interface WaypointGraph {
  nodes: Record<string, [number, number]>;
  ringOrder: string[];
}

export interface CityLayout {
  lots: Lot[];
  allSlots: Lot[];
  emptyLots: Lot[];
  graph: WaypointGraph;
}

/**
 * Generates the deterministic 40-slot checkerboard layout (4 rows x 10 columns, all facing +Z)
 * plus a closed serpentine waypoint loop: east along row 1's street, west along row 2's, and so on,
 * then back up the west boulevard. If `lotCount < 40` (e.g. 36), `lots` holds the active `1..lotCount`
 * lots and `emptyLots` the remaining slots, which are rendered as green mini-parks.
 */
export function generateCityLayout(lotCount = 36): CityLayout {
  const clampedCount = Math.min(40, Math.max(1, Math.floor(lotCount)));
  const nodes: Record<string, [number, number]> = {};
  const ringOrder: string[] = [];

  const addRingNode = (id: string, x: number, z: number): void => {
    nodes[id] = [x, z];
    ringOrder.push(id);
  };

  const westX = ROAD_X[0] ?? -52;
  const eastX = ROAD_X[ROAD_X.length - 1] ?? 52;

  ROW_Z.forEach((_, r) => {
    const roadZ = ROAD_Z[r]!;
    const eastbound = r % 2 === 0;
    const startX = eastbound ? westX : eastX;
    const endX = eastbound ? eastX : westX;
    addRingNode(`wp_r${r}_start`, startX, roadZ);

    const cols = COLUMN_X.map((x, c) => ({ x, c }));
    if (!eastbound) cols.reverse();
    for (const { x, c } of cols) {
      addRingNode(`wp_r${r}_c${c}`, x, roadZ);
    }
    addRingNode(`wp_r${r}_end`, endX, roadZ);
  });

  // Return leg up the west boulevard back to the first node (closes the loop)
  for (let r = ROW_Z.length - 2; r >= 1; r -= 1) {
    addRingNode(`wp_ret_${r}`, westX, ROAD_Z[r]!);
  }

  const allSlots: Lot[] = [];
  let nextId = 1;

  ROW_Z.forEach((rowZ, r) => {
    const roadZ = ROAD_Z[r]!;
    const eastbound = r % 2 === 0;
    COLUMN_X.forEach((x, c) => {
      allSlots.push({
        id: nextId++,
        position: [x, 0, rowZ],
        rotationY: 0,
        roadWaypointId: `wp_r${r}_c${c}`,
        // Parked on the lane next to the shop-side sidewalk, heading with the row's driving direction
        parkingPoint: [x, roadZ - 1.2],
        parkingHeading: eastbound ? 0 : Math.PI,
        cameraFocus: {
          position: [x, 8.2, rowZ + 10.2],
          lookAt: [x, 2.8, rowZ + 0.5],
        },
        sidewalkPatrol: {
          a: [x - 2, rowZ + 3.8],
          b: [x + 2, rowZ + 3.8],
        },
      });
    });
  });

  return {
    lots: allSlots.slice(0, clampedCount),
    allSlots,
    emptyLots: allSlots.slice(clampedCount),
    graph: {
      nodes,
      ringOrder,
    },
  };
}

/**
 * Checks if the finite segment from `origin` to `target` intersects a lot's 3D bounding box
 * (footprint LOT_SIZE x LOT_SIZE, height MAX_BUILDING_HEIGHT = 14).
 */
export function segmentIntersectsLotAABB(
  origin: readonly [number, number, number],
  target: readonly [number, number, number],
  lot: Lot,
  buildingHeight: number = MAX_BUILDING_HEIGHT
): boolean {
  const half = LOT_SIZE / 2;
  const minBounds: [number, number, number] = [
    lot.position[0] - half,
    0,
    lot.position[2] - half,
  ];
  const maxBounds: [number, number, number] = [
    lot.position[0] + half,
    buildingHeight,
    lot.position[2] + half,
  ];

  let tMin = 0;
  let tMax = 1;

  for (let axis = 0; axis < 3; axis += 1) {
    const o = origin[axis]!;
    const d = target[axis]! - o;
    const bMin = minBounds[axis]!;
    const bMax = maxBounds[axis]!;

    if (Math.abs(d) < 1e-8) {
      if (o < bMin || o > bMax) return false;
    } else {
      const invD = 1 / d;
      let t1 = (bMin - o) * invD;
      let t2 = (bMax - o) * invD;
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }

  return tMin <= tMax;
}

