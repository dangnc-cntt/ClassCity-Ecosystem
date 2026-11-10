import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import { GROUND_DEPTH, GROUND_WIDTH } from '../../config/cityLayout';

// Deterministic PRNG so the island silhouette is identical on every run
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRIM = {
  box: new THREE.BoxGeometry(1, 1, 1),
  hex: new THREE.CylinderGeometry(1, 0.62, 1, 6),
  hexFlat: new THREE.CylinderGeometry(1, 0.88, 1, 6),
  cone: new THREE.ConeGeometry(1, 1, 7),
  rock: new THREE.DodecahedronGeometry(1, 0),
  crystal: new THREE.OctahedronGeometry(1, 0),
  cloud: new THREE.IcosahedronGeometry(1, 1),
};

/**
 * Builds the sculpted underside of the flying island: terraced grass/soil rims,
 * organic clusters of faceted basalt/stone columns tapering down to a craggy keel,
 * and turquoise waterfalls spilling over the front cliff edge.
 */
function buildIslandBodyParts(): ColoredPartSpec[] {
  const w = GROUND_WIDTH;
  const d = GROUND_DEPTH;
  const rng = mulberry32(20261110);
  const parts: ColoredPartSpec[] = [
    // Soft mossy top rim just below ground plane (avoids z-fighting)
    { geometry: PRIM.box, color: '#22C55E', position: [0, -0.32, 0], scale: [w + 0.8, 0.56, d + 0.8] },
    { geometry: PRIM.box, color: '#92400E', position: [0, -1.65, 0], scale: [w - 1, 2.2, d - 1] },
    { geometry: PRIM.box, color: '#78350F', position: [0, -3.55, 0], scale: [w - 5.5, 1.8, d - 5.5] },
  ];

  // Organic rocky skirt around the entire island perimeter so the rectangular rim feels hand-carved
  const rockPalette = ['#57534E', '#44403C', '#6B5B4D', '#78716C'];
  for (let i = 0; i < 40; i += 1) {
    const t = i / 40;
    const angle = t * Math.PI * 2;
    const rx = (w * 0.45) * (0.85 + rng() * 0.14);
    const rz = (d * 0.45) * (0.85 + rng() * 0.14);
    const x = Math.cos(angle) * rx;
    const z = Math.sin(angle) * rz;
    const colR = 5.5 + rng() * 5.0;
    const depth = 7 + rng() * 9;
    parts.push({
      geometry: PRIM.hex,
      color: rockPalette[i % rockPalette.length]!,
      position: [x, -3.5 - depth / 2, z],
      rotation: [0, rng() * Math.PI, 0],
      scale: [colR, depth, colR],
    });
  }

  // Clustered mid & deep tapered rock pillars forming a stepped fantasy silhouette (no flat cone!)
  const deepPalette = ['#44403C', '#3F3F46', '#57534E', '#292524'];
  for (let ring = 0; ring < 3; ring += 1) {
    const count = ring === 0 ? 14 : ring === 1 ? 8 : 3;
    const radiusScale = ring === 0 ? 0.34 : ring === 1 ? 0.18 : 0.06;
    const minDepth = ring === 0 ? 16 : ring === 1 ? 26 : 36;
    const maxExtra = ring === 0 ? 10 : ring === 1 ? 11 : 9;

    for (let i = 0; i < count; i += 1) {
      const ang = (i / count) * Math.PI * 2 + ring * 0.45 + (rng() - 0.5) * 0.25;
      const x = Math.cos(ang) * w * radiusScale * (0.8 + rng() * 0.35);
      const z = Math.sin(ang) * d * radiusScale * (0.8 + rng() * 0.35);
      const depth = minDepth + rng() * maxExtra;
      const colR = (ring === 0 ? 8.5 : ring === 1 ? 9.5 : 10) + rng() * 4;
      parts.push({
        geometry: PRIM.hex,
        color: deepPalette[(i + ring) % deepPalette.length]!,
        position: [x, -3.5 - depth / 2, z],
        rotation: [0, rng() * Math.PI, 0],
        scale: [colR, depth, colR],
      });
    }
  }

  // Hanging roots / mossy vines along the cliff underside
  for (let i = 0; i < 16; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (w * 0.48) * (0.6 + rng() * 0.38);
    const z = (rng() - 0.5) * d * 0.88;
    const len = 3 + rng() * 5.5;
    parts.push({
      geometry: PRIM.cone,
      color: i % 3 === 0 ? '#15803D' : '#16A34A',
      position: [x, -2.5 - len / 2, z],
      rotation: [Math.PI, 0, 0],
      scale: [0.55 + rng() * 0.4, len, 0.55 + rng() * 0.4],
    });
  }

  // Twin waterfalls spilling out from the front edge below the two park ponds (x = +-33, z = +50)
  for (const wx of [-33, 33]) {
    // Stone spillway notch on the cliff face
    parts.push({
      geometry: PRIM.box,
      color: '#BAE6FD',
      position: [wx, -0.1, d * 0.5 - 1.2],
      scale: [6.4, 0.35, 3.2],
    });
    // Vertical falling stream & inner bright core terminating cleanly inside the base mist puffs
    parts.push(
      {
        geometry: PRIM.box,
        color: '#0EA5E9',
        position: [wx, -15, d * 0.5 + 0.35],
        scale: [5.2, 30, 0.85],
      },
      {
        geometry: PRIM.box,
        color: '#7DD3FC',
        position: [wx, -14.2, d * 0.5 + 0.72],
        scale: [3.2, 28.4, 0.45],
      },
      // Crest lip foam at cliff edge
      {
        geometry: PRIM.cloud,
        color: '#F0F9FF',
        position: [wx, -0.4, d * 0.5 + 0.5],
        scale: [3.2, 0.8, 1.4],
      }
    );
  }

  return parts;
}

/** Builds luminous crystals embedded under the rock pillars (rendered with subtle emissive glow). */
function buildCrystalParts(): ColoredPartSpec[] {
  const rng = mulberry32(88991);
  const colors = ['#38BDF8', '#22D3EE', '#A78BFA', '#67E8F9', '#F472B6'];
  const parts: ColoredPartSpec[] = [];
  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2 + rng() * 0.25;
    const rx = (0.18 + rng() * 0.26) * GROUND_WIDTH;
    const rz = (0.18 + rng() * 0.26) * GROUND_DEPTH;
    const depth = 9 + rng() * 20;
    const size = 1.2 + rng() * 2.0;
    parts.push({
      geometry: PRIM.crystal,
      color: colors[i % colors.length]!,
      position: [Math.cos(angle) * rx, -depth, Math.sin(angle) * rz],
      rotation: [rng() * 0.5, rng() * Math.PI, rng() * 0.5],
      scale: [size * 0.65, size * 2.1, size * 0.65],
    });
  }
  return parts;
}

/** Builds satellite sky-rocks with grass caps and miniature pine trees drifting beside the island. */
function buildFloatingRockParts(): ColoredPartSpec[] {
  const rng = mulberry32(777);
  const rockColors = ['#78716C', '#57534E', '#A8A29E'];
  const parts: ColoredPartSpec[] = [];
  for (let i = 0; i < 12; i += 1) {
    const ang = (i / 12) * Math.PI * 2 + 0.2;
    const x = Math.cos(ang) * (GROUND_WIDTH * 0.58 + rng() * 24);
    const z = Math.sin(ang) * (GROUND_DEPTH * 0.58 + rng() * 22);
    const y = -5 - rng() * 24;
    const r = 2.0 + rng() * 3.8;
    parts.push(
      {
        geometry: PRIM.rock,
        color: rockColors[i % rockColors.length]!,
        position: [x, y, z],
        rotation: [rng() * 3, rng() * 3, rng() * 3],
        scale: [r, r * 0.9, r],
      },
      {
        geometry: PRIM.hexFlat,
        color: '#22C55E',
        position: [x, y + r * 0.72, z],
        scale: [r * 0.92, 0.5, r * 0.92],
      }
    );
    // Tiny tree or crystal perched on larger floating boulders
    if (r > 3.2) {
      parts.push(
        {
          geometry: PRIM.hexFlat,
          color: '#78350F',
          position: [x + 0.3, y + r * 1.15, z],
          scale: [0.22, 0.9, 0.22],
        },
        {
          geometry: PRIM.cone,
          color: i % 3 === 0 ? '#F9A8D4' : '#16A34A',
          position: [x + 0.3, y + r * 1.65, z],
          scale: [1.1, 2.2, 1.1],
        }
      );
    }
  }
  return parts;
}

/** Builds soft waterfall mist + sculpted cloud banks below the island. */
function buildCloudParts(): ColoredPartSpec[] {
  const rng = mulberry32(4242);
  const parts: ColoredPartSpec[] = [];

  // Waterfall splash foam puffs at the base of the twin cascades
  for (const wx of [-33, 33]) {
    for (let p = 0; p < 5; p += 1) {
      parts.push({
        geometry: PRIM.cloud,
        color: p % 2 === 0 ? '#F0F9FF' : '#BAE6FD',
        position: [
          wx + (p - 2) * 2.1,
          -31.5 + Math.sin(p) * 1.2,
          GROUND_DEPTH * 0.5 + 1.0 + (rng() - 0.5) * 2.5,
        ],
        scale: [2.8 + rng() * 1.6, 1.6 + rng() * 0.9, 2.5 + rng() * 1.4],
      });
    }
  }

  // Drifting outer cloud clusters under the sky island
  for (let c = 0; c < 11; c += 1) {
    const angle = (c / 11) * Math.PI * 2;
    const radius = 84 + rng() * 44;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius * 0.78;
    const cy = -32 - rng() * 16;
    for (let p = 0; p < 5; p += 1) {
      const s = 3.2 + rng() * 4.8;
      parts.push({
        geometry: PRIM.cloud,
        color: p % 2 === 0 ? '#F8FAFC' : '#DDD6FE',
        position: [
          cx + (p - 2) * 3.6,
          cy + (p % 2 === 0 ? 1.2 : -0.4),
          cz + (rng() - 0.5) * 4.5,
        ],
        scale: [s * 1.55, s * 0.65, s * 1.05],
      });
    }
  }
  return parts;
}

const ISLAND_BODY_GEOM = mergeColoredGeometries(buildIslandBodyParts());
const CRYSTALS_GEOM = mergeColoredGeometries(buildCrystalParts());
const FLOATING_ROCKS_GEOM = mergeColoredGeometries(buildFloatingRockParts());
const CLOUDS_GEOM = mergeColoredGeometries(buildCloudParts());

const ISLAND_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.06,
  flatShading: true,
});
const CRYSTAL_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.2,
  metalness: 0.35,
  emissive: '#38BDF8',
  emissiveIntensity: 0.45,
  flatShading: true,
});
const CLOUD_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.95,
  emissive: '#A5B4FC',
  emissiveIntensity: 0.25,
  transparent: true,
  opacity: 0.92,
  flatShading: true,
});

export interface FloatingIslandProps {
  reducedMotion?: boolean;
}

/**
 * Turns the city ground into a sculpted floating sky island: terraced cliff edges,
 * clustered basalt pillars, luminous crystals, twin waterfalls, satellite mossy boulders
 * and soft drifting clouds below. Uses only 4 draw calls (Rule 8.9) and `useFrame` refs (R4).
 */
export function FloatingIsland({ reducedMotion = false }: FloatingIslandProps) {
  const rocksRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (rocksRef.current) {
      rocksRef.current.position.y = Math.sin(t * 0.65) * 1.3;
      rocksRef.current.rotation.y = Math.sin(t * 0.14) * 0.07;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.012;
      cloudsRef.current.position.y = Math.cos(t * 0.5) * 0.7;
    }
  });

  return (
    <group name="FloatingIsland">
      <mesh geometry={ISLAND_BODY_GEOM} material={ISLAND_MAT} />
      <mesh geometry={CRYSTALS_GEOM} material={CRYSTAL_MAT} />
      <mesh ref={rocksRef} geometry={FLOATING_ROCKS_GEOM} material={ISLAND_MAT} />
      <mesh ref={cloudsRef} geometry={CLOUDS_GEOM} material={CLOUD_MAT} />
    </group>
  );
}
