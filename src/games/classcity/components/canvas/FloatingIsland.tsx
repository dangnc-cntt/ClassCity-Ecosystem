import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import { GROUND_DEPTH, GROUND_WIDTH } from '../../config/cityLayout';

const SQRT2 = Math.SQRT2;

// Deterministic PRNG so the island silhouette is identical on every run (no Math.random in render)
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
  // 4-sided inverted pyramid; rotated PI/4 so its square base is axis-aligned
  pyramid: new THREE.ConeGeometry(1, 1, 4, 1),
  rock: new THREE.DodecahedronGeometry(1, 0),
  crystal: new THREE.OctahedronGeometry(1, 0),
  cloud: new THREE.IcosahedronGeometry(1, 1),
};

/** Builds the static underside: grass lip, layered soil, rocky inverted pyramid and hanging crystals. */
function buildIslandBodyParts(): ColoredPartSpec[] {
  const w = GROUND_WIDTH;
  const d = GROUND_DEPTH;
  const parts: ColoredPartSpec[] = [
    // Grass lip, top face kept just below y=0 to avoid z-fighting with the ground plane
    { geometry: PRIM.box, color: '#34D399', position: [0, -0.3, 0], scale: [w + 0.6, 0.55, d + 0.6] },
    { geometry: PRIM.box, color: '#A16207', position: [0, -1.9, 0], scale: [w, 2.7, d] },
    { geometry: PRIM.box, color: '#854D0E', position: [0, -4.4, 0], scale: [w - 6, 2.4, d - 6] },
    { geometry: PRIM.box, color: '#6B3F1D', position: [0, -6.4, 0], scale: [w - 14, 2, d - 14] },
  ];

  // Main rocky keel: two stacked inverted pyramids for a stepped, faceted silhouette
  const baseW = w - 22;
  const baseD = d - 22;
  parts.push(
    {
      geometry: PRIM.pyramid,
      color: '#78716C',
      position: [0, -7.4 - 17, 0],
      rotation: [Math.PI, Math.PI / 4, 0],
      scale: [baseW / SQRT2, 34, baseD / SQRT2],
    },
    {
      geometry: PRIM.pyramid,
      color: '#57534E',
      position: [0, -7.4 - 31, 0],
      rotation: [Math.PI, Math.PI / 4, 0],
      scale: [(baseW * 0.55) / SQRT2, 46, (baseD * 0.55) / SQRT2],
    }
  );

  // Glowing crystals planted on the keel's four faces (sampled on the pyramid surface so they are visible)
  const rng = mulberry32(20261110);
  const crystalColors = ['#67E8F9', '#A5F3FC', '#22D3EE', '#C4B5FD'];
  const keelTopY = -7.4;
  const keelHeight = 34;
  for (let i = 0; i < 18; i += 1) {
    const depth = 3 + rng() * 24;
    const shrink = 1 - depth / keelHeight;
    const hw = (baseW / 2) * shrink;
    const hd = (baseD / 2) * shrink;
    const u = (rng() - 0.5) * 1.6;
    const face = i % 4;
    const x = face === 0 ? u * hw * 2 : face === 1 ? u * hw * 2 : face === 2 ? hw : -hw;
    const z = face === 0 ? hd : face === 1 ? -hd : u * hd * 2;
    const size = 1.2 + rng() * 2.2;
    parts.push({
      geometry: PRIM.crystal,
      color: crystalColors[i % crystalColors.length]!,
      position: [x, keelTopY - depth - size * 0.6, z],
      rotation: [rng() * 0.5, rng() * Math.PI, rng() * 0.5],
      scale: [size * 0.6, size * 1.9, size * 0.6],
    });
  }

  return parts;
}

function buildFloatingRockParts(): ColoredPartSpec[] {
  const rng = mulberry32(777);
  const rockColors = ['#A8A29E', '#78716C', '#D6D3D1'];
  const grassCaps = ['#4ADE80', '#34D399'];
  const parts: ColoredPartSpec[] = [];
  for (let i = 0; i < 9; i += 1) {
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (GROUND_WIDTH * 0.5 + 6 + rng() * 22);
    const z = (rng() - 0.5) * GROUND_DEPTH * 1.5;
    const y = -6 - rng() * 30;
    const r = 1.8 + rng() * 3.6;
    parts.push({
      geometry: PRIM.rock,
      color: rockColors[i % rockColors.length]!,
      position: [x, y, z],
      rotation: [rng() * 3, rng() * 3, rng() * 3],
      scale: [r, r * 0.85, r],
    });
    // Tiny grass cap on larger rocks
    if (r > 3) {
      parts.push({
        geometry: PRIM.box,
        color: grassCaps[i % grassCaps.length]!,
        position: [x, y + r * 0.75, z],
        scale: [r * 1.1, 0.35, r * 1.1],
      });
    }
  }
  return parts;
}

function buildCloudParts(): ColoredPartSpec[] {
  const rng = mulberry32(4242);
  const parts: ColoredPartSpec[] = [];
  for (let c = 0; c < 9; c += 1) {
    const angle = (c / 9) * Math.PI * 2;
    const radius = 70 + rng() * 40;
    const cx = Math.cos(angle) * radius;
    const cz = Math.sin(angle) * radius * 0.8;
    const cy = -34 - rng() * 14;
    for (let p = 0; p < 4; p += 1) {
      const s = 4 + rng() * 5;
      parts.push({
        geometry: PRIM.cloud,
        color: p % 2 === 0 ? '#E9D5FF' : '#FBCFE8',
        position: [cx + (p - 1.5) * 4.5, cy + rng() * 2, cz + (rng() - 0.5) * 4],
        scale: [s * 1.5, s * 0.7, s],
      });
    }
  }
  return parts;
}

const ISLAND_BODY_GEOM = mergeColoredGeometries(buildIslandBodyParts());
const FLOATING_ROCKS_GEOM = mergeColoredGeometries(buildFloatingRockParts());
const CLOUDS_GEOM = mergeColoredGeometries(buildCloudParts());

const ISLAND_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.85,
  metalness: 0.05,
  flatShading: true,
});
const CLOUD_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 1,
  emissive: '#C084FC',
  emissiveIntensity: 0.45,
  flatShading: true,
});

export interface FloatingIslandProps {
  reducedMotion?: boolean;
}

/**
 * Turns the city ground into a floating sky island: layered soil, rocky keel, hanging crystals,
 * bobbing satellite rocks and drifting clouds below. Only 3 draw calls total (Rule 8.9),
 * animated through refs inside `useFrame` (R4) and skipped when reduced motion is requested.
 */
export function FloatingIsland({ reducedMotion = false }: FloatingIslandProps) {
  const rocksRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (rocksRef.current) {
      rocksRef.current.position.y = Math.sin(t * 0.6) * 1.2;
      rocksRef.current.rotation.y = Math.sin(t * 0.12) * 0.08;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.015;
    }
  });

  return (
    <group name="FloatingIsland">
      <mesh geometry={ISLAND_BODY_GEOM} material={ISLAND_MAT} />
      <mesh ref={rocksRef} geometry={FLOATING_ROCKS_GEOM} material={ISLAND_MAT} />
      <mesh ref={cloudsRef} geometry={CLOUDS_GEOM} material={CLOUD_MAT} />
    </group>
  );
}
