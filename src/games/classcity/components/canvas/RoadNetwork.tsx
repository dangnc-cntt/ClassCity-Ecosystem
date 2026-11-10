import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import {
  GROUND_DEPTH,
  GROUND_WIDTH,
  LOT_SIZE,
  PARK_Z_END,
  PARK_Z_START,
  ROAD_WIDTH,
  ROAD_X,
  ROAD_Z,
  ROAD_Z_MAX,
  ROAD_Z_MIN,
  ROW_Z,
  WONDER_CENTER,
  WONDER_RADIUS,
  type Lot,
} from '../../config/cityLayout';

const ROAD_LEFT = (ROAD_X[0] ?? -52) - ROAD_WIDTH / 2;
const ROAD_RIGHT = (ROAD_X[ROAD_X.length - 1] ?? 52) + ROAD_WIDTH / 2;
const ROAD_SPAN_X = ROAD_RIGHT - ROAD_LEFT;
const VERTICAL_LEN = ROAD_Z_MAX - ROAD_Z_MIN;
const VERTICAL_CENTER_Z = (ROAD_Z_MAX + ROAD_Z_MIN) / 2;
const PARK_DEPTH = PARK_Z_END - PARK_Z_START;
const PARK_CENTER_Z = (PARK_Z_END + PARK_Z_START) / 2;
const PARK_WIDTH = ROAD_SPAN_X - 2;
const CENTER_ROAD_X = ROAD_X[1] ?? 0;
const SIDEWALK_INNER = CENTER_ROAD_X + ROAD_WIDTH / 2 + 1;
const SIDEWALK_OUTER = 46;
const SIDEWALK_LEN = SIDEWALK_OUTER - SIDEWALK_INNER;

const PUFF_GEOM = new THREE.IcosahedronGeometry(1, 1);

const LAYERED_CANOPY_GEOM = mergeColoredGeometries([
  { geometry: PUFF_GEOM, color: '#15803D', position: [0, 0.1, 0], scale: [1.05, 0.92, 1.05] },
  { geometry: PUFF_GEOM, color: '#22C55E', position: [0.42, -0.1, 0.25], scale: [0.76, 0.68, 0.76] },
  { geometry: PUFF_GEOM, color: '#16A34A', position: [-0.4, -0.14, -0.22], scale: [0.78, 0.7, 0.78] },
  { geometry: PUFF_GEOM, color: '#4ADE80', position: [0.08, 0.58, -0.05], scale: [0.68, 0.6, 0.68] },
]);

// Shared geometries & materials for RoadNetwork & Instanced props (Rule 8.2 & 8.3)
const ENV_GEOM = {
  ground: new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_DEPTH),
  box: new THREE.BoxGeometry(1, 1, 1),
  disc: new THREE.CylinderGeometry(1, 1, 1, 32),
  emptyParkGrass: new THREE.BoxGeometry(LOT_SIZE - 0.4, 0.18, LOT_SIZE - 0.4),
  dashMark: new THREE.BoxGeometry(1.8, 0.02, 0.22),
  treeTrunk: new THREE.CylinderGeometry(0.18, 0.28, 1.4, 8),
  treeCrown: LAYERED_CANOPY_GEOM,
  lampPole: new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8),
  lampBulb: new THREE.SphereGeometry(0.24, 10, 10),
};

const ENV_MAT = {
  parkGrass: new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.85 }),
  dashWhite: new THREE.MeshBasicMaterial({ color: '#F8FAFC' }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.85 }),
  treeCrown: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.68,
    flatShading: true,
  }),
  lampPole: new THREE.MeshStandardMaterial({
    color: '#475569',
    metalness: 0.5,
    roughness: 0.4,
  }),
  lampBulb: new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.85,
  }),
  mergedGround: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
  }),
};

const ASPHALT = '#334155';
const SIDEWALK = '#E2E8F0';

function buildStaticBaseGeometry(): THREE.BufferGeometry {
  const parts: ColoredPartSpec[] = [
    {
      geometry: ENV_GEOM.ground,
      color: '#4ADE80',
      rotation: [-Math.PI / 2, 0, 0],
    },
    // Public park lawn in front of the city, with a lighter checkered mowing pattern
    {
      geometry: ENV_GEOM.box,
      color: '#86EFAC',
      position: [0, 0.05, PARK_CENTER_Z],
      scale: [PARK_WIDTH, 0.1, PARK_DEPTH],
    },
  ];

  // Checkerboard mowing tiles on the lawn
  const tile = 8;
  const cols = Math.floor(PARK_WIDTH / tile);
  const rows = Math.floor(PARK_DEPTH / tile);
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      if ((i + j) % 2 !== 0) continue;
      parts.push({
        geometry: ENV_GEOM.box,
        color: '#4ADE80',
        position: [
          -PARK_WIDTH / 2 + tile * (i + 0.5) + (PARK_WIDTH - cols * tile) / 2,
          0.11,
          PARK_Z_START + tile * (j + 0.5) + (PARK_DEPTH - rows * tile) / 2,
        ],
        scale: [tile, 0.04, tile],
      });
    }
  }

  // Horizontal streets in front of each shop row
  for (const z of ROAD_Z) {
    parts.push({
      geometry: ENV_GEOM.box,
      color: ASPHALT,
      position: [0, 0.04, z],
      scale: [ROAD_SPAN_X, 0.08, ROAD_WIDTH],
    });
  }
  // Vertical streets: two boulevards + central avenue
  for (const x of ROAD_X) {
    parts.push({
      geometry: ENV_GEOM.box,
      color: ASPHALT,
      position: [x, 0.045, VERTICAL_CENTER_Z],
      scale: [ROAD_WIDTH, 0.08, VERTICAL_LEN],
    });
  }

  // Shop-front sidewalks (split by the central avenue)
  for (const z of ROW_Z) {
    for (const side of [-1, 1]) {
      parts.push({
        geometry: ENV_GEOM.box,
        color: SIDEWALK,
        position: [side * (SIDEWALK_INNER + SIDEWALK_LEN / 2), 0.07, z + 3.75],
        scale: [SIDEWALK_LEN, 0.14, 1.4],
      });
    }
  }

  // Park paths: cross-shaped promenade and plaza ring around the Class Wonder
  parts.push(
    {
      geometry: ENV_GEOM.box,
      color: '#F1F5F9',
      position: [0, 0.13, WONDER_CENTER[2]],
      scale: [PARK_WIDTH - 6, 0.05, 3],
    },
    {
      geometry: ENV_GEOM.box,
      color: '#F1F5F9',
      position: [0, 0.13, PARK_CENTER_Z],
      scale: [3, 0.05, PARK_DEPTH - 2],
    },
    {
      geometry: ENV_GEOM.disc,
      color: '#F1F5F9',
      position: [WONDER_CENTER[0], 0.14, WONDER_CENTER[2]],
      scale: [WONDER_RADIUS + 2.4, 0.06, WONDER_RADIUS + 2.4],
    }
  );

  // Two ponds feeding streams straight to the island's twin front waterfalls + wooden footbridges
  for (const pondX of [-33, 33]) {
    parts.push(
      {
        geometry: ENV_GEOM.disc,
        color: '#94A3B8',
        position: [pondX, 0.125, WONDER_CENTER[2] + 1],
        scale: [8.1, 0.05, 6.1],
      },
      {
        geometry: ENV_GEOM.disc,
        color: '#BAE6FD',
        position: [pondX, 0.145, WONDER_CENTER[2] + 1],
        scale: [7.4, 0.06, 5.4],
      },
      {
        geometry: ENV_GEOM.disc,
        color: '#0EA5E9',
        position: [pondX, 0.175, WONDER_CENTER[2] + 1],
        scale: [6.4, 0.06, 4.4],
      },
      // Outflow creek connecting the pond to the front cliff waterfall at z = +50
      {
        geometry: ENV_GEOM.box,
        color: '#BAE6FD',
        position: [pondX, 0.135, 42.5],
        scale: [5.6, 0.06, 15.2],
      },
      {
        geometry: ENV_GEOM.box,
        color: '#0EA5E9',
        position: [pondX, 0.165, 42.5],
        scale: [4.6, 0.06, 15.2],
      },
      // Arched-feel wooden footbridge across the stream
      {
        geometry: ENV_GEOM.box,
        color: '#92400E',
        position: [pondX, 0.34, 41.5],
        scale: [6.4, 0.24, 2.2],
      },
      {
        geometry: ENV_GEOM.box,
        color: '#B45309',
        position: [pondX, 0.62, 40.5],
        scale: [6.4, 0.18, 0.18],
      },
      {
        geometry: ENV_GEOM.box,
        color: '#B45309',
        position: [pondX, 0.62, 42.5],
        scale: [6.4, 0.18, 0.18],
      }
    );
  }

  // Park benches facing the Class Wonder plaza
  const benchOffsets: Array<[number, number, number]> = [
    [-11.5, WONDER_CENTER[2] - 4.2, Math.PI / 4],
    [11.5, WONDER_CENTER[2] - 4.2, -Math.PI / 4],
    [-11.5, WONDER_CENTER[2] + 4.2, (Math.PI * 3) / 4],
    [11.5, WONDER_CENTER[2] + 4.2, -(Math.PI * 3) / 4],
  ];
  for (const [bx, bz, ry] of benchOffsets) {
    parts.push(
      {
        geometry: ENV_GEOM.box,
        color: '#B45309',
        position: [bx, 0.42, bz],
        rotation: [0, ry, 0],
        scale: [2.4, 0.16, 0.72],
      },
      {
        geometry: ENV_GEOM.box,
        color: '#78350F',
        position: [bx, 0.68, bz],
        rotation: [0, ry, 0],
        scale: [2.4, 0.36, 0.16],
      }
    );
  }

  return mergeColoredGeometries(parts);
}

// Pre-merge static grass, lawn, streets, sidewalks, paths and ponds into 1 draw call (Rule 8.9)
const STATIC_ROAD_BASE_GEOM = buildStaticBaseGeometry();

interface PropTransform {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}

function isFreeParkSpot(x: number, z: number): boolean {
  // Keep trees off the paths, benches, Wonder plaza, ponds and outflow streams
  if (Math.abs(x) < 3.4) return false;
  if (Math.abs(z - WONDER_CENTER[2]) < 3.4) return false;
  if (Math.hypot(x - WONDER_CENTER[0], z - WONDER_CENTER[2]) < WONDER_RADIUS + 4.8) {
    return false;
  }
  for (const pondX of [-33, 33]) {
    if (Math.hypot((x - pondX) / 9, (z - (WONDER_CENTER[2] + 1)) / 7) < 1) {
      return false;
    }
    if (z >= WONDER_CENTER[2] + 1 && Math.abs(x - pondX) < 5.2) {
      return false;
    }
  }
  return true;
}

export interface RoadNetworkProps {
  emptyLots?: readonly Lot[];
}

/**
 * Renders the checkerboard street grid, sidewalks, front park and batched `<Instances>`
 * for trees, streetlights and road markings (Rule 8.2).
 */
export function RoadNetwork({ emptyLots = [] }: RoadNetworkProps) {
  const { treeTransforms, lampTransforms, dashTransforms } = useMemo(() => {
    const trees: PropTransform[] = [];
    const lamps: PropTransform[] = [];
    const dashes: PropTransform[] = [];

    // Park trees on a lattice with a deterministic jitter
    let k = 0;
    for (let x = -56; x <= 56; x += 7) {
      for (const z of [PARK_Z_START + 4, PARK_Z_START + 12, PARK_Z_END - 3]) {
        k += 1;
        const jx = ((k * 37) % 5) - 2;
        const jz = ((k * 53) % 5) - 2;
        const tx = x + jx * 0.4;
        const tz = z + jz * 0.4;
        if (isFreeParkSpot(tx, tz)) {
          trees.push({ position: [tx, 0, tz], scale: 0.9 + (k % 4) * 0.08 });
        }
      }
    }
    // Staggered back & side greenery belts outside the roads (avoids rigid picket-row look)
    let edgeIdx = 0;
    for (let x = -57; x <= 57; x += 8.2) {
      edgeIdx += 1;
      const offset = ((edgeIdx * 29) % 5) - 2;
      trees.push({
        position: [x, 0, -45.5 + offset * 0.65],
        scale: 0.95 + (edgeIdx % 3) * 0.16,
      });
    }
    for (let z = -37; z <= 13; z += 9) {
      edgeIdx += 1;
      const ox = ((edgeIdx * 17) % 3) - 1;
      trees.push({
        position: [-59 + ox * 0.7, 0, z],
        scale: 0.9 + (edgeIdx % 4) * 0.12,
      });
      trees.push({
        position: [59 - ox * 0.7, 0, z],
        scale: 0.9 + ((edgeIdx + 1) % 4) * 0.12,
      });
    }
    // Trees on empty lots (e.g. slots 37-40 when class has 36 students)
    for (const emptyLot of emptyLots) {
      trees.push({
        position: [emptyLot.position[0] - 1.1, 0, emptyLot.position[2] - 0.8],
        scale: 0.95,
      });
      trees.push({
        position: [emptyLot.position[0] + 1.2, 0, emptyLot.position[2] + 0.9],
        scale: 0.8,
      });
    }

    // Streetlights between shops along every street's shop-side edge, and along the park paths
    for (const rowZ of ROW_Z) {
      for (const x of [-37, -29, -21, -13, 13, 21, 29, 37]) {
        lamps.push({ position: [x, 0, rowZ + 4.2] });
      }
    }
    for (const x of [-20, -10, 10, 20]) {
      lamps.push({ position: [x, 0, WONDER_CENTER[2] - 2.2] });
      lamps.push({ position: [x, 0, WONDER_CENTER[2] + 2.2] });
    }

    // Dashed road markings, skipping the intersections
    const nearVertical = (x: number) =>
      ROAD_X.some((rx) => Math.abs(x - rx) < ROAD_WIDTH / 2 + 1.2);
    for (const z of ROAD_Z) {
      for (let x = ROAD_LEFT + 3; x <= ROAD_RIGHT - 3; x += 5) {
        if (!nearVertical(x)) {
          dashes.push({ position: [x, 0.09, z], rotationY: 0 });
        }
      }
    }
    const nearHorizontal = (z: number) =>
      ROAD_Z.some((rz) => Math.abs(z - rz) < ROAD_WIDTH / 2 + 1.2);
    for (const x of ROAD_X) {
      for (let z = ROAD_Z_MIN + 2; z <= ROAD_Z_MAX - 2; z += 4.5) {
        if (!nearHorizontal(z)) {
          dashes.push({ position: [x, 0.095, z], rotationY: Math.PI / 2 });
        }
      }
    }

    return {
      treeTransforms: trees,
      lampTransforms: lamps,
      dashTransforms: dashes,
    };
  }, [emptyLots]);

  return (
    <group name="RoadNetwork">
      {/* Merged grass ground, park lawn, checkerboard streets, sidewalks and ponds (1 Draw Call) */}
      <mesh
        geometry={STATIC_ROAD_BASE_GEOM}
        material={ENV_MAT.mergedGround}
        receiveShadow
      />

      {/* Empty lots rendered as instanced green mini-parks (1 Draw Call) */}
      {emptyLots.length > 0 && (
        <Instances
          limit={emptyLots.length}
          geometry={ENV_GEOM.emptyParkGrass}
          material={ENV_MAT.parkGrass}
          receiveShadow
        >
          {emptyLots.map((lot) => (
            <Instance
              key={`empty-park-${lot.id}`}
              position={[lot.position[0], 0.09, lot.position[2]]}
            />
          ))}
        </Instances>
      )}

      {/* Instanced White Road Markings (1 Draw Call) */}
      <Instances
        limit={dashTransforms.length}
        geometry={ENV_GEOM.dashMark}
        material={ENV_MAT.dashWhite}
      >
        {dashTransforms.map((d, i) => (
          <Instance
            key={`dash-${i}`}
            position={d.position}
            rotation={[0, d.rotationY ?? 0, 0]}
          />
        ))}
      </Instances>

      {/* Instanced Tree Trunks (1 Draw Call) */}
      <Instances
        limit={treeTransforms.length}
        geometry={ENV_GEOM.treeTrunk}
        material={ENV_MAT.treeTrunk}
      >
        {treeTransforms.map((t, i) => {
          const s = t.scale ?? 1;
          return (
            <Instance
              key={`trunk-${i}`}
              position={[t.position[0], 0.65 * s, t.position[2]]}
              scale={[s, s, s]}
            />
          );
        })}
      </Instances>

      {/* Instanced Tree Crowns (1 Draw Call) */}
      <Instances
        limit={treeTransforms.length}
        geometry={ENV_GEOM.treeCrown}
        material={ENV_MAT.treeCrown}
      >
        {treeTransforms.map((t, i) => {
          const s = t.scale ?? 1;
          return (
            <Instance
              key={`crown-${i}`}
              position={[t.position[0], 1.85 * s, t.position[2]]}
              rotation={[0, (i * 1.37) % (Math.PI * 2), 0]}
              scale={[s, s, s]}
            />
          );
        })}
      </Instances>

      {/* Instanced Streetlight Poles (1 Draw Call) */}
      <Instances
        limit={lampTransforms.length}
        geometry={ENV_GEOM.lampPole}
        material={ENV_MAT.lampPole}
      >
        {lampTransforms.map((l, i) => (
          <Instance
            key={`pole-${i}`}
            position={[l.position[0], 1.8, l.position[2]]}
          />
        ))}
      </Instances>

      {/* Instanced Streetlight Bulbs (1 Draw Call) */}
      <Instances
        limit={lampTransforms.length}
        geometry={ENV_GEOM.lampBulb}
        material={ENV_MAT.lampBulb}
      >
        {lampTransforms.map((l, i) => (
          <Instance
            key={`bulb-${i}`}
            position={[l.position[0], 3.7, l.position[2]]}
          />
        ))}
      </Instances>
    </group>
  );
}
