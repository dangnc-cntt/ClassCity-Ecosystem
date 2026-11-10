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

// Shared geometries & materials for RoadNetwork & Instanced props (Rule 8.2 & 8.3)
const ENV_GEOM = {
  ground: new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_DEPTH),
  box: new THREE.BoxGeometry(1, 1, 1),
  disc: new THREE.CylinderGeometry(1, 1, 1, 32),
  emptyParkGrass: new THREE.BoxGeometry(LOT_SIZE - 0.4, 0.18, LOT_SIZE - 0.4),
  dashMark: new THREE.BoxGeometry(1.8, 0.02, 0.22),
  treeTrunk: new THREE.CylinderGeometry(0.18, 0.26, 1.3, 8),
  treeCrown: new THREE.ConeGeometry(1.1, 2.6, 8),
  lampPole: new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8),
  lampBulb: new THREE.SphereGeometry(0.24, 10, 10),
};

const ENV_MAT = {
  parkGrass: new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.85 }),
  dashWhite: new THREE.MeshBasicMaterial({ color: '#F8FAFC' }),
  treeTrunk: new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.85 }),
  treeCrown: new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.65 }),
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

  // Two ponds with lighter rims
  for (const pondX of [-33, 33]) {
    parts.push(
      {
        geometry: ENV_GEOM.disc,
        color: '#BAE6FD',
        position: [pondX, 0.13, WONDER_CENTER[2] + 1],
        scale: [7.6, 0.06, 5.6],
      },
      {
        geometry: ENV_GEOM.disc,
        color: '#38BDF8',
        position: [pondX, 0.17, WONDER_CENTER[2] + 1],
        scale: [6.6, 0.06, 4.6],
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
  // Keep trees off the paths, the Wonder plaza and both ponds
  if (Math.abs(x) < 3) return false;
  if (Math.abs(z - WONDER_CENTER[2]) < 3) return false;
  if (Math.hypot(x - WONDER_CENTER[0], z - WONDER_CENTER[2]) < WONDER_RADIUS + 3.5) {
    return false;
  }
  for (const pondX of [-33, 33]) {
    if (Math.hypot((x - pondX) / 9, (z - (WONDER_CENTER[2] + 1)) / 7) < 1) {
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
    // Back tree line behind the first shop row and side belts outside the boulevards
    for (let x = -58; x <= 58; x += 7.5) {
      trees.push({ position: [x, 0, -46], scale: 1.15 });
    }
    for (let z = -38; z <= 12; z += 8.5) {
      trees.push({ position: [-59.5, 0, z], scale: 1.05 });
      trees.push({ position: [59.5, 0, z], scale: 1.05 });
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
              position={[t.position[0], 2.1 * s, t.position[2]]}
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
