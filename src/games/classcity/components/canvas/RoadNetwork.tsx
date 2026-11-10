import { useMemo } from 'react';
import { Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { mergeColoredGeometries } from '../../../../three-kit/mergeColoredGeometries';
import {
  GROUND_DEPTH,
  GROUND_WIDTH,
  LOT_SIZE,
  ROAD_WIDTH,
  WONDER_RADIUS,
  type Lot,
} from '../../config/cityLayout';

// Shared geometries & materials for RoadNetwork & Instanced props (Rule 8.2 & 8.3)
const ENV_GEOM = {
  ground: new THREE.PlaneGeometry(GROUND_WIDTH, GROUND_DEPTH),
  roadHoriz: new THREE.BoxGeometry(75, 0.08, ROAD_WIDTH),
  roadVert: new THREE.BoxGeometry(ROAD_WIDTH, 0.08, 49),
  roundaboutAsphalt: new THREE.CylinderGeometry(
    WONDER_RADIUS + ROAD_WIDTH * 0.75,
    WONDER_RADIUS + ROAD_WIDTH * 0.75,
    0.09,
    36
  ),
  sidewalkStripH: new THREE.BoxGeometry(66, 0.14, 2.2),
  sidewalkStripV: new THREE.BoxGeometry(2.2, 0.14, 38),
  emptyParkGrass: new THREE.BoxGeometry(LOT_SIZE - 0.4, 0.18, LOT_SIZE - 0.4),
  dashMark: new THREE.BoxGeometry(1.8, 0.02, 0.22),
  treeTrunk: new THREE.CylinderGeometry(0.18, 0.26, 1.3, 8),
  treeCrown: new THREE.ConeGeometry(1.1, 2.6, 8),
  lampPole: new THREE.CylinderGeometry(0.08, 0.11, 3.6, 8),
  lampBulb: new THREE.SphereGeometry(0.24, 10, 10),
};

const ENV_MAT = {
  grass: new THREE.MeshStandardMaterial({ color: '#4ADE80', roughness: 0.9 }),
  parkGrass: new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.85 }),
  asphalt: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: '#E2E8F0', roughness: 0.75 }),
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

// Pre-merge static grass ground, asphalt roads, roundabout, and sidewalks into 1 draw call (Rule 8.9)
const STATIC_ROAD_BASE_GEOM = mergeColoredGeometries([
  {
    geometry: ENV_GEOM.ground,
    color: '#4ADE80',
    rotation: [-Math.PI / 2, 0, 0],
  },
  { geometry: ENV_GEOM.roadHoriz, color: '#334155', position: [0, 0.04, -22] },
  { geometry: ENV_GEOM.roadHoriz, color: '#334155', position: [0, 0.04, 22] },
  { geometry: ENV_GEOM.roadHoriz, color: '#334155', position: [0, 0.04, 0] },
  { geometry: ENV_GEOM.roadVert, color: '#334155', position: [-35, 0.04, 0] },
  { geometry: ENV_GEOM.roadVert, color: '#334155', position: [35, 0.04, 0] },
  {
    geometry: ENV_GEOM.roundaboutAsphalt,
    color: '#334155',
    position: [0, 0.045, 0],
  },
  {
    geometry: ENV_GEOM.sidewalkStripH,
    color: '#E2E8F0',
    position: [0, 0.07, -26],
  },
  {
    geometry: ENV_GEOM.sidewalkStripH,
    color: '#E2E8F0',
    position: [0, 0.07, -18],
  },
  {
    geometry: ENV_GEOM.sidewalkStripH,
    color: '#E2E8F0',
    position: [0, 0.07, 18],
  },
  {
    geometry: ENV_GEOM.sidewalkStripH,
    color: '#E2E8F0',
    position: [0, 0.07, 26],
  },
  {
    geometry: ENV_GEOM.sidewalkStripV,
    color: '#E2E8F0',
    position: [-39, 0.07, 0],
  },
  {
    geometry: ENV_GEOM.sidewalkStripV,
    color: '#E2E8F0',
    position: [39, 0.07, 0],
  },
]);

interface PropTransform {
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
}

export interface RoadNetworkProps {
  emptyLots?: readonly Lot[];
}

/**
 * Renders the city ground, closed-loop road network, roundabout, sidewalks,
 * and batched `<Instances>` for trees, streetlights, and road markings (Rule 8.2).
 */
export function RoadNetwork({ emptyLots = [] }: RoadNetworkProps) {
  const { treeTransforms, lampTransforms, dashTransforms } = useMemo(() => {
    const trees: PropTransform[] = [];
    const lamps: PropTransform[] = [];
    const dashes: PropTransform[] = [];

    // Outer perimeter decorative trees
    for (let x = -54; x <= 54; x += 9) {
      trees.push({ position: [x, 0, -41], scale: 1.1 });
      trees.push({ position: [x, 0, 41], scale: 1.1 });
    }
    for (let z = -34; z <= 34; z += 8.5) {
      trees.push({ position: [-54, 0, z], scale: 1.05 });
      trees.push({ position: [54, 0, z], scale: 1.05 });
    }
    // Central avenue park trees
    for (const x of [-24, -16, 16, 24]) {
      trees.push({ position: [x, 0, -5.2], scale: 0.85 });
      trees.push({ position: [x, 0, 5.2], scale: 0.85 });
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

    // Streetlights along North, South, East, West roads
    for (const x of [-28, -14, 0, 14, 28]) {
      lamps.push({ position: [x, 0, -25.1] });
      lamps.push({ position: [x, 0, -18.9] });
      lamps.push({ position: [x, 0, 18.9] });
      lamps.push({ position: [x, 0, 25.1] });
    }
    for (const z of [-12, 0, 12]) {
      lamps.push({ position: [-38.1, 0, z] });
      lamps.push({ position: [38.1, 0, z] });
    }

    // Dashed white road markings on North, South, Center horizontal lanes
    for (let x = -30; x <= 30; x += 5) {
      dashes.push({ position: [x, 0.09, -22], rotationY: 0 });
      dashes.push({ position: [x, 0.09, 22], rotationY: 0 });
      if (Math.abs(x) > WONDER_RADIUS + 4) {
        dashes.push({ position: [x, 0.09, 0], rotationY: 0 });
      }
    }
    // Dashed white road markings on West & East vertical lanes
    for (let z = -18; z <= 18; z += 4.5) {
      dashes.push({ position: [-35, 0.09, z], rotationY: Math.PI / 2 });
      dashes.push({ position: [35, 0.09, z], rotationY: Math.PI / 2 });
    }

    return {
      treeTransforms: trees,
      lampTransforms: lamps,
      dashTransforms: dashes,
    };
  }, [emptyLots]);

  return (
    <group name="RoadNetwork">
      {/* Merged grass ground, asphalt loop, roundabout, and sidewalks (1 Draw Call) */}
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
