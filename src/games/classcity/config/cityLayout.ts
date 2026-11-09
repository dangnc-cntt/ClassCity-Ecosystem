export const LOT_SIZE = 6;
export const MAX_BUILDING_HEIGHT = 14;
export const GROUND_WIDTH = 130;
export const GROUND_DEPTH = 100;
export const ROAD_WIDTH = 5;
export const WONDER_RADIUS = 7;

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

const HORIZONTAL_X_ASC = [-28, -20, -12, -4, 4, 12, 20, 28] as const;
const HORIZONTAL_X_DESC = [28, 20, 12, 4, -4, -12, -20, -28] as const;
const VERTICAL_Z_ASC = [-14, -6, 6, 14] as const;
const VERTICAL_Z_DESC = [14, 6, -6, -14] as const;

/**
 * Generates deterministic 40-slot city layout + closed-loop waypoint graph (Rule 6.1).
 * If `lotCount < 40` (e.g. 36), `lots` contains the active `1..lotCount` lots and `emptyLots` contains the remaining green park slots.
 */
export function generateCityLayout(lotCount = 36): CityLayout {
  const clampedCount = Math.min(40, Math.max(1, Math.floor(lotCount)));
  const nodes: Record<string, [number, number]> = {};
  const ringOrder: string[] = [];

  const addRingNode = (id: string, x: number, z: number): void => {
    nodes[id] = [x, z];
    ringOrder.push(id);
  };

  // Clockwise ring road: NW corner -> North lane -> NE corner -> East lane -> SE corner -> South lane -> SW corner -> West lane
  addRingNode('wp_corner_nw', -35, -22);
  HORIZONTAL_X_ASC.forEach((x, idx) => {
    addRingNode(`wp_n_${idx + 1}`, x, -22);
  });
  addRingNode('wp_corner_ne', 35, -22);
  VERTICAL_Z_ASC.forEach((z, idx) => {
    addRingNode(`wp_e_${idx + 1}`, 35, z);
  });
  addRingNode('wp_corner_se', 35, 22);
  HORIZONTAL_X_DESC.forEach((x, idx) => {
    addRingNode(`wp_s_${idx + 1}`, x, 22);
  });
  addRingNode('wp_corner_sw', -35, 22);
  VERTICAL_Z_DESC.forEach((z, idx) => {
    addRingNode(`wp_w_${idx + 1}`, -35, z);
  });

  const allSlots: Lot[] = [];
  let nextId = 1;

  // 1. North Outer (8 lots: 1..8) at z = -30, facing South (0 rad)
  HORIZONTAL_X_ASC.forEach((x, idx) => {
    const wpId = `wp_n_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [x, 0, -30],
      rotationY: 0,
      roadWaypointId: wpId,
      parkingPoint: [x, -23.2],
      parkingHeading: 0,
      cameraFocus: {
        position: [x, 7.2, -18.5],
        lookAt: [x, 2.5, -28.5],
      },
      sidewalkPatrol: {
        a: [x - 2, -26.2],
        b: [x + 2, -26.2],
      },
    });
  });

  // 2. East Outer (4 lots: 9..12) at x = 43, facing West (-PI/2 rad)
  VERTICAL_Z_ASC.forEach((z, idx) => {
    const wpId = `wp_e_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [43, 0, z],
      rotationY: -Math.PI / 2,
      roadWaypointId: wpId,
      parkingPoint: [36.2, z],
      parkingHeading: Math.PI / 2,
      cameraFocus: {
        position: [31.5, 7.2, z],
        lookAt: [41.5, 2.5, z],
      },
      sidewalkPatrol: {
        a: [39.2, z - 2],
        b: [39.2, z + 2],
      },
    });
  });

  // 3. South Outer (8 lots: 13..20) at z = 30, facing North (PI rad)
  HORIZONTAL_X_DESC.forEach((x, idx) => {
    const wpId = `wp_s_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [x, 0, 30],
      rotationY: Math.PI,
      roadWaypointId: wpId,
      parkingPoint: [x, 23.2],
      parkingHeading: Math.PI,
      cameraFocus: {
        position: [x, 7.2, 18.5],
        lookAt: [x, 2.5, 28.5],
      },
      sidewalkPatrol: {
        a: [x - 2, 26.2],
        b: [x + 2, 26.2],
      },
    });
  });

  // 4. West Outer (4 lots: 21..24) at x = -43, facing East (PI/2 rad)
  VERTICAL_Z_DESC.forEach((z, idx) => {
    const wpId = `wp_w_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [-43, 0, z],
      rotationY: Math.PI / 2,
      roadWaypointId: wpId,
      parkingPoint: [-36.2, z],
      parkingHeading: -Math.PI / 2,
      cameraFocus: {
        position: [-31.5, 7.2, z],
        lookAt: [-41.5, 2.5, z],
      },
      sidewalkPatrol: {
        a: [-39.2, z - 2],
        b: [-39.2, z + 2],
      },
    });
  });

  // 5. North Inner (8 lots: 25..32) at z = -14, facing North road (PI rad)
  HORIZONTAL_X_ASC.forEach((x, idx) => {
    const wpId = `wp_n_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [x, 0, -14],
      rotationY: Math.PI,
      roadWaypointId: wpId,
      parkingPoint: [x, -20.8],
      parkingHeading: 0,
      cameraFocus: {
        position: [x, 7.2, -25.5],
        lookAt: [x, 2.5, -15.5],
      },
      sidewalkPatrol: {
        a: [x - 2, -17.8],
        b: [x + 2, -17.8],
      },
    });
  });

  // 6. South Inner (8 lots: 33..40) at z = 14, facing South road (0 rad)
  HORIZONTAL_X_DESC.forEach((x, idx) => {
    const wpId = `wp_s_${idx + 1}`;
    allSlots.push({
      id: nextId++,
      position: [x, 0, 14],
      rotationY: 0,
      roadWaypointId: wpId,
      parkingPoint: [x, 20.8],
      parkingHeading: Math.PI,
      cameraFocus: {
        position: [x, 7.2, 25.5],
        lookAt: [x, 2.5, 15.5],
      },
      sidewalkPatrol: {
        a: [x - 2, 17.8],
        b: [x + 2, 17.8],
      },
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
