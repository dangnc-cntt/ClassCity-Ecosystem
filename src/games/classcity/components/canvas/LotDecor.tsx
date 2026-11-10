import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import type {
  FenceItemId,
  LotCustomization,
  PetItemId,
  SignItemId,
  TreeItemId,
} from '../../config/lotItemsCatalog';

function hashPhase(studentId: string): number {
  let h = 2166136261;
  for (let i = 0; i < studentId.length; i += 1) {
    h ^= studentId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 628) / 100;
}

const PRIM = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 10, 8),
};

const YARD_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.72,
  metalness: 0.05,
});

const PET_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.48,
  metalness: 0.06,
});

const MAX_YARD_CACHE = 128;
const yardGeometryCache = new Map<string, THREE.BufferGeometry>();
const petGeometryCache = new Map<Exclude<PetItemId, 'none'>, THREE.BufferGeometry>();

// Private yard bounds around each shop (centered at [0, 0, -0.05], inside 8x14 cell without touching road/sidewalk)
const YARD_W = 6.9;
const YARD_D = 6.2;
const YARD_BACK_Z = -3.05;
const YARD_FRONT_Z = 2.95;
const YARD_HALF_X = 3.32;
const GATE_HALF_X = 1.05;

function pushFenceParts(parts: ColoredPartSpec[], fence: FenceItemId): void {
  if (fence === 'none') return;

  if (fence === 'white_picket') {
    const picket = '#F8FAFC';
    const post = '#E2E8F0';
    // Horizontal rails along back and sides
    parts.push(
      { geometry: PRIM.box, color: post, position: [0, 0.34, YARD_BACK_Z], scale: [YARD_HALF_X * 2, 0.08, 0.08] },
      { geometry: PRIM.box, color: post, position: [-YARD_HALF_X, 0.34, -0.05], scale: [0.08, 0.08, YARD_D - 0.25] },
      { geometry: PRIM.box, color: post, position: [YARD_HALF_X, 0.34, -0.05], scale: [0.08, 0.08, YARD_D - 0.25] }
    );
    // Corner and gate posts
    const keyPosts: Array<[number, number]> = [
      [-YARD_HALF_X, YARD_BACK_Z],
      [YARD_HALF_X, YARD_BACK_Z],
      [-YARD_HALF_X, YARD_FRONT_Z],
      [YARD_HALF_X, YARD_FRONT_Z],
      [-GATE_HALF_X, YARD_FRONT_Z],
      [GATE_HALF_X, YARD_FRONT_Z],
    ];
    for (const [px, pz] of keyPosts) {
      parts.push({ geometry: PRIM.box, color: '#FFFFFF', position: [px, 0.42, pz], scale: [0.16, 0.72, 0.16] });
      parts.push({ geometry: PRIM.box, color: '#FDE047', position: [px, 0.81, pz], scale: [0.2, 0.08, 0.2] });
    }
    // Back pickets
    for (let x = -2.9; x <= 2.91; x += 0.58) {
      parts.push({ geometry: PRIM.box, color: picket, position: [x, 0.38, YARD_BACK_Z], scale: [0.16, 0.62, 0.06] });
    }
    // Side pickets
    for (let z = -2.5; z <= 2.51; z += 0.62) {
      parts.push({ geometry: PRIM.box, color: picket, position: [-YARD_HALF_X, 0.38, z], scale: [0.06, 0.62, 0.16] });
      parts.push({ geometry: PRIM.box, color: picket, position: [YARD_HALF_X, 0.38, z], scale: [0.06, 0.62, 0.16] });
    }
    // Front picket wings flanking central gate
    for (const dir of [-1, 1]) {
      parts.push({
        geometry: PRIM.box,
        color: post,
        position: [dir * ((GATE_HALF_X + YARD_HALF_X) / 2), 0.34, YARD_FRONT_Z],
        scale: [YARD_HALF_X - GATE_HALF_X, 0.08, 0.08],
      });
      for (let x = 1.55; x <= 2.85; x += 0.55) {
        parts.push({ geometry: PRIM.box, color: picket, position: [dir * x, 0.38, YARD_FRONT_Z], scale: [0.16, 0.62, 0.06] });
      }
    }
    return;
  }

  if (fence === 'brick_wall') {
    const brick = '#C2410C';
    const cap = '#FED7AA';
    const pillar = '#9A3412';
    // Back + left + right walls
    parts.push(
      { geometry: PRIM.box, color: brick, position: [0, 0.36, YARD_BACK_Z], scale: [YARD_HALF_X * 2, 0.56, 0.18] },
      { geometry: PRIM.box, color: cap, position: [0, 0.67, YARD_BACK_Z], scale: [YARD_HALF_X * 2 + 0.1, 0.08, 0.24] },
      { geometry: PRIM.box, color: brick, position: [-YARD_HALF_X, 0.36, -0.05], scale: [0.18, 0.56, YARD_D - 0.2] },
      { geometry: PRIM.box, color: cap, position: [-YARD_HALF_X, 0.67, -0.05], scale: [0.24, 0.08, YARD_D - 0.15] },
      { geometry: PRIM.box, color: brick, position: [YARD_HALF_X, 0.36, -0.05], scale: [0.18, 0.56, YARD_D - 0.2] },
      { geometry: PRIM.box, color: cap, position: [YARD_HALF_X, 0.67, -0.05], scale: [0.24, 0.08, YARD_D - 0.15] }
    );
    // Front brick walls flanking gate (kept slightly lower at 0.44 so yard pets stay visible)
    for (const dir of [-1, 1]) {
      const cx = dir * ((GATE_HALF_X + YARD_HALF_X) / 2);
      const span = YARD_HALF_X - GATE_HALF_X;
      parts.push(
        { geometry: PRIM.box, color: brick, position: [cx, 0.28, YARD_FRONT_Z], scale: [span, 0.42, 0.18] },
        { geometry: PRIM.box, color: cap, position: [cx, 0.52, YARD_FRONT_Z], scale: [span + 0.06, 0.07, 0.24] },
        { geometry: PRIM.box, color: pillar, position: [dir * GATE_HALF_X, 0.44, YARD_FRONT_Z], scale: [0.26, 0.72, 0.26] },
        { geometry: PRIM.box, color: cap, position: [dir * GATE_HALF_X, 0.84, YARD_FRONT_Z], scale: [0.32, 0.09, 0.32] },
        { geometry: PRIM.box, color: pillar, position: [dir * YARD_HALF_X, 0.42, YARD_FRONT_Z], scale: [0.22, 0.68, 0.22] },
        { geometry: PRIM.box, color: pillar, position: [dir * YARD_HALF_X, 0.48, YARD_BACK_Z], scale: [0.24, 0.8, 0.24] }
      );
    }
    return;
  }

  if (fence === 'hedge') {
    const leafDark = '#15803D';
    const leafLight = '#22C55E';
    parts.push(
      { geometry: PRIM.box, color: leafDark, position: [0, 0.42, YARD_BACK_Z], scale: [YARD_HALF_X * 2 + 0.2, 0.68, 0.38] },
      { geometry: PRIM.box, color: leafLight, position: [-YARD_HALF_X, 0.42, -0.05], scale: [0.38, 0.68, YARD_D - 0.1] },
      { geometry: PRIM.box, color: leafLight, position: [YARD_HALF_X, 0.42, -0.05], scale: [0.38, 0.68, YARD_D - 0.1] }
    );
    const flowerDots = ['#F472B6', '#FACC15', '#FB7185'];
    for (const dir of [-1, 1]) {
      const cx = dir * ((GATE_HALF_X + YARD_HALF_X) / 2);
      const span = YARD_HALF_X - GATE_HALF_X;
      parts.push({ geometry: PRIM.box, color: leafDark, position: [cx, 0.34, YARD_FRONT_Z], scale: [span, 0.52, 0.36] });
      // Decorative blossoms along the top of the front hedge
      for (let i = 0; i < 3; i += 1) {
        parts.push({
          geometry: PRIM.sphere,
          color: flowerDots[(i + (dir > 0 ? 1 : 0)) % flowerDots.length]!,
          position: [dir * (1.45 + i * 0.68), 0.62, YARD_FRONT_Z],
          scale: [0.11, 0.09, 0.11],
        });
      }
    }
    return;
  }

  // stone_wall
  const stone = '#64748B';
  const stoneTop = '#94A3B8';
  const lantern = '#FEF08A';
  parts.push(
    { geometry: PRIM.box, color: stone, position: [0, 0.38, YARD_BACK_Z], scale: [YARD_HALF_X * 2, 0.62, 0.22] },
    { geometry: PRIM.box, color: stoneTop, position: [0, 0.72, YARD_BACK_Z], scale: [YARD_HALF_X * 2 + 0.08, 0.08, 0.28] },
    { geometry: PRIM.box, color: stone, position: [-YARD_HALF_X, 0.38, -0.05], scale: [0.22, 0.62, YARD_D - 0.15] },
    { geometry: PRIM.box, color: stone, position: [YARD_HALF_X, 0.38, -0.05], scale: [0.22, 0.62, YARD_D - 0.15] }
  );
  for (const dir of [-1, 1]) {
    const cx = dir * ((GATE_HALF_X + YARD_HALF_X) / 2);
    const span = YARD_HALF_X - GATE_HALF_X;
    parts.push(
      { geometry: PRIM.box, color: stone, position: [cx, 0.28, YARD_FRONT_Z], scale: [span, 0.42, 0.22] },
      { geometry: PRIM.box, color: stoneTop, position: [cx, 0.52, YARD_FRONT_Z], scale: [span + 0.08, 0.07, 0.28] },
      { geometry: PRIM.box, color: '#475569', position: [dir * GATE_HALF_X, 0.45, YARD_FRONT_Z], scale: [0.28, 0.74, 0.28] },
      { geometry: PRIM.sphere, color: lantern, position: [dir * GATE_HALF_X, 0.92, YARD_FRONT_Z], scale: [0.13, 0.13, 0.13] }
    );
  }
}

function pushTreeParts(parts: ColoredPartSpec[], tree: TreeItemId): void {
  if (tree === 'none') return;

  const frontLeft: [number, number] = [-2.68, 1.95];
  const backRight: [number, number] = [2.68, -2.28];

  const addTreeAt = (x: number, z: number, scale: number) => {
    if (tree === 'pine') {
      parts.push(
        { geometry: PRIM.cyl, color: '#78350F', position: [x, 0.08 + 0.45 * scale, z], scale: [0.13 * scale, 0.9 * scale, 0.13 * scale] },
        { geometry: PRIM.cone, color: '#15803D', position: [x, 0.08 + 1.15 * scale, z], scale: [0.62 * scale, 1.05 * scale, 0.62 * scale] },
        { geometry: PRIM.cone, color: '#16A34A', position: [x, 0.08 + 1.72 * scale, z], scale: [0.46 * scale, 0.9 * scale, 0.46 * scale] }
      );
    } else if (tree === 'sakura') {
      parts.push(
        { geometry: PRIM.cyl, color: '#7C2D12', position: [x, 0.08 + 0.52 * scale, z], rotation: [0, 0, 0.08], scale: [0.12 * scale, 1.04 * scale, 0.12 * scale] },
        { geometry: PRIM.sphere, color: '#F9A8D4', position: [x, 0.08 + 1.32 * scale, z], scale: [0.62 * scale, 0.5 * scale, 0.62 * scale] },
        { geometry: PRIM.sphere, color: '#FBCFE8', position: [x + 0.25 * scale, 0.08 + 1.52 * scale, z + 0.12 * scale], scale: [0.42 * scale, 0.36 * scale, 0.42 * scale] },
        { geometry: PRIM.sphere, color: '#F472B6', position: [x - 0.22 * scale, 0.08 + 1.24 * scale, z - 0.14 * scale], scale: [0.38 * scale, 0.32 * scale, 0.38 * scale] }
      );
    } else if (tree === 'fruit_tree') {
      parts.push(
        { geometry: PRIM.cyl, color: '#92400E', position: [x, 0.08 + 0.5 * scale, z], scale: [0.13 * scale, 1.0 * scale, 0.13 * scale] },
        { geometry: PRIM.sphere, color: '#16A34A', position: [x, 0.08 + 1.35 * scale, z], scale: [0.58 * scale, 0.56 * scale, 0.58 * scale] },
        { geometry: PRIM.sphere, color: '#F97316', position: [x + 0.36 * scale, 0.08 + 1.3 * scale, z + 0.34 * scale], scale: [0.11 * scale, 0.11 * scale, 0.11 * scale] },
        { geometry: PRIM.sphere, color: '#FB923C', position: [x - 0.32 * scale, 0.08 + 1.52 * scale, z + 0.36 * scale], scale: [0.11 * scale, 0.11 * scale, 0.11 * scale] },
        { geometry: PRIM.sphere, color: '#F97316', position: [x + 0.1 * scale, 0.08 + 1.12 * scale, z - 0.44 * scale], scale: [0.11 * scale, 0.11 * scale, 0.11 * scale] }
      );
    } else {
      // flower_bed: planter box + 3 colorful blooms
      parts.push(
        { geometry: PRIM.box, color: '#B45309', position: [x, 0.08 + 0.12, z], scale: [0.95 * scale, 0.24, 0.62 * scale] },
        { geometry: PRIM.box, color: '#16A34A', position: [x, 0.08 + 0.25, z], scale: [0.82 * scale, 0.08, 0.48 * scale] },
        { geometry: PRIM.sphere, color: '#F43F5E', position: [x - 0.26 * scale, 0.08 + 0.4, z], scale: [0.14 * scale, 0.14 * scale, 0.14 * scale] },
        { geometry: PRIM.sphere, color: '#FACC15', position: [x, 0.08 + 0.44, z + 0.05 * scale], scale: [0.15 * scale, 0.15 * scale, 0.15 * scale] },
        { geometry: PRIM.sphere, color: '#A855F7', position: [x + 0.26 * scale, 0.08 + 0.4, z - 0.04 * scale], scale: [0.14 * scale, 0.14 * scale, 0.14 * scale] }
      );
    }
  };

  addTreeAt(frontLeft[0], frontLeft[1], 1.0);
  addTreeAt(backRight[0], backRight[1], 0.85);
}

function pushSignParts(parts: ColoredPartSpec[], sign: SignItemId): void {
  if (sign === 'none') return;

  const sx = 2.52;
  const sz = 2.24;

  if (sign === 'wooden_board') {
    parts.push(
      { geometry: PRIM.box, color: '#78350F', position: [sx - 0.28, 0.08 + 0.4, sz], scale: [0.08, 0.8, 0.08] },
      { geometry: PRIM.box, color: '#78350F', position: [sx + 0.28, 0.08 + 0.4, sz], scale: [0.08, 0.8, 0.08] },
      { geometry: PRIM.box, color: '#D97706', position: [sx, 0.08 + 0.68, sz], scale: [0.85, 0.45, 0.1] },
      { geometry: PRIM.box, color: '#FEF3C7', position: [sx, 0.08 + 0.68, sz + 0.06], scale: [0.7, 0.3, 0.03] },
      { geometry: PRIM.box, color: '#92400E', position: [sx, 0.08 + 0.94, sz], scale: [0.95, 0.08, 0.18] }
    );
  } else if (sign === 'standing_banner') {
    parts.push(
      { geometry: PRIM.box, color: '#0F766E', position: [sx, 0.08 + 0.46, sz + 0.1], rotation: [-0.18, -0.25, 0], scale: [0.58, 0.9, 0.06] },
      { geometry: PRIM.box, color: '#F8FAFC', position: [sx, 0.08 + 0.48, sz + 0.14], rotation: [-0.18, -0.25, 0], scale: [0.46, 0.68, 0.03] },
      { geometry: PRIM.box, color: '#FBBF24', position: [sx, 0.08 + 0.72, sz + 0.12], rotation: [-0.18, -0.25, 0], scale: [0.42, 0.14, 0.05] },
      { geometry: PRIM.box, color: '#115E59', position: [sx, 0.08 + 0.45, sz - 0.08], rotation: [0.18, -0.25, 0], scale: [0.58, 0.88, 0.06] }
    );
  } else if (sign === 'neon_post') {
    parts.push(
      { geometry: PRIM.cyl, color: '#334155', position: [sx, 0.08 + 0.55, sz], scale: [0.07, 1.1, 0.07] },
      { geometry: PRIM.box, color: '#1E293B', position: [sx, 0.08 + 0.98, sz], scale: [0.82, 0.48, 0.12] },
      { geometry: PRIM.box, color: '#22D3EE', position: [sx, 0.08 + 0.98, sz + 0.07], scale: [0.72, 0.36, 0.03] },
      { geometry: PRIM.box, color: '#F472B6', position: [sx, 0.08 + 1.24, sz], scale: [0.4, 0.1, 0.1] }
    );
  } else {
    // mailbox_sign
    parts.push(
      { geometry: PRIM.cyl, color: '#78350F', position: [sx, 0.08 + 0.44, sz], scale: [0.08, 0.88, 0.08] },
      { geometry: PRIM.box, color: '#EF4444', position: [sx, 0.08 + 0.94, sz], scale: [0.46, 0.32, 0.58] },
      { geometry: PRIM.box, color: '#F8FAFC', position: [sx, 0.08 + 0.94, sz + 0.3], scale: [0.34, 0.2, 0.03] },
      { geometry: PRIM.box, color: '#FACC15', position: [sx + 0.26, 0.08 + 1.06, sz + 0.05], scale: [0.05, 0.24, 0.14] }
    );
  }
}

function getMergedYardGeometry(items: Pick<LotCustomization, 'fence' | 'tree' | 'sign'>): THREE.BufferGeometry {
  const key = `${items.fence}|${items.tree}|${items.sign}`;
  const cached = yardGeometryCache.get(key);
  if (cached) {
    yardGeometryCache.delete(key);
    yardGeometryCache.set(key, cached);
    return cached;
  }

  const parts: ColoredPartSpec[] = [
    // Raised stone yard curb defining private property boundary cleanly
    { geometry: PRIM.box, color: '#94A3B8', position: [0, 0.025, -0.05], scale: [YARD_W, 0.05, YARD_D] },
    // Personal yard lawn carpet inside the curb
    { geometry: PRIM.box, color: '#34D399', position: [0, 0.055, -0.05], scale: [YARD_W - 0.28, 0.05, YARD_D - 0.28] },
    // Front stone walkway leading from front door out to the public sidewalk
    { geometry: PRIM.box, color: '#E2E8F0', position: [0, 0.085, 2.48], scale: [1.35, 0.03, 1.3] },
  ];

  pushFenceParts(parts, items.fence);
  pushTreeParts(parts, items.tree);
  pushSignParts(parts, items.sign);

  const merged = mergeColoredGeometries(parts);
  if (yardGeometryCache.size >= MAX_YARD_CACHE) {
    const oldest = yardGeometryCache.keys().next().value;
    if (oldest !== undefined) {
      yardGeometryCache.get(oldest)?.dispose();
      yardGeometryCache.delete(oldest);
    }
  }
  yardGeometryCache.set(key, merged);
  return merged;
}

function getMergedPetGeometry(pet: Exclude<PetItemId, 'none'>): THREE.BufferGeometry {
  const existing = petGeometryCache.get(pet);
  if (existing) return existing;

  const parts: ColoredPartSpec[] = [];
  if (pet === 'puppy') {
    parts.push(
      { geometry: PRIM.box, color: '#D97706', position: [0, 0.24, 0], scale: [0.3, 0.24, 0.44] },
      { geometry: PRIM.sphere, color: '#F59E0B', position: [0, 0.44, 0.18], scale: [0.17, 0.16, 0.17] },
      { geometry: PRIM.box, color: '#92400E', position: [-0.15, 0.4, 0.16], rotation: [0, 0, 0.2], scale: [0.06, 0.18, 0.1] },
      { geometry: PRIM.box, color: '#92400E', position: [0.15, 0.4, 0.16], rotation: [0, 0, -0.2], scale: [0.06, 0.18, 0.1] },
      { geometry: PRIM.sphere, color: '#FEF3C7', position: [0, 0.4, 0.32], scale: [0.09, 0.07, 0.08] },
      { geometry: PRIM.sphere, color: '#0F172A', position: [0, 0.43, 0.39], scale: [0.035, 0.03, 0.03] },
      { geometry: PRIM.box, color: '#EF4444', position: [0, 0.34, 0.14], scale: [0.22, 0.05, 0.22] },
      { geometry: PRIM.box, color: '#F59E0B', position: [0, 0.34, -0.24], rotation: [0.6, 0, 0], scale: [0.06, 0.18, 0.06] },
      { geometry: PRIM.cyl, color: '#B45309', position: [-0.09, 0.08, 0.14], scale: [0.05, 0.16, 0.05] },
      { geometry: PRIM.cyl, color: '#B45309', position: [0.09, 0.08, 0.14], scale: [0.05, 0.16, 0.05] },
      { geometry: PRIM.cyl, color: '#B45309', position: [-0.09, 0.08, -0.14], scale: [0.05, 0.16, 0.05] },
      { geometry: PRIM.cyl, color: '#B45309', position: [0.09, 0.08, -0.14], scale: [0.05, 0.16, 0.05] }
    );
  } else if (pet === 'kitten') {
    parts.push(
      { geometry: PRIM.box, color: '#F8FAFC', position: [0, 0.2, 0], scale: [0.24, 0.2, 0.36] },
      { geometry: PRIM.sphere, color: '#FDE68A', position: [0, 0.37, 0.15], scale: [0.14, 0.13, 0.14] },
      { geometry: PRIM.cone, color: '#FB923C', position: [-0.08, 0.52, 0.14], rotation: [0, 0, 0.18], scale: [0.06, 0.12, 0.06] },
      { geometry: PRIM.cone, color: '#FB923C', position: [0.08, 0.52, 0.14], rotation: [0, 0, -0.18], scale: [0.06, 0.12, 0.06] },
      { geometry: PRIM.sphere, color: '#0F172A', position: [-0.05, 0.39, 0.27], scale: [0.025, 0.025, 0.02] },
      { geometry: PRIM.sphere, color: '#0F172A', position: [0.05, 0.39, 0.27], scale: [0.025, 0.025, 0.02] },
      { geometry: PRIM.box, color: '#EC4899', position: [0, 0.29, 0.12], scale: [0.18, 0.04, 0.18] },
      { geometry: PRIM.cyl, color: '#FB923C', position: [0, 0.3, -0.2], rotation: [0.35, 0, 0], scale: [0.035, 0.24, 0.035] }
    );
  } else if (pet === 'bunny') {
    parts.push(
      { geometry: PRIM.sphere, color: '#FFFFFF', position: [0, 0.2, 0], scale: [0.16, 0.17, 0.21] },
      { geometry: PRIM.sphere, color: '#FFFFFF', position: [0, 0.38, 0.12], scale: [0.13, 0.12, 0.13] },
      { geometry: PRIM.box, color: '#FFFFFF', position: [-0.05, 0.57, 0.1], rotation: [0, 0, 0.08], scale: [0.05, 0.22, 0.04] },
      { geometry: PRIM.box, color: '#FFFFFF', position: [0.05, 0.57, 0.1], rotation: [0, 0, -0.08], scale: [0.05, 0.22, 0.04] },
      { geometry: PRIM.box, color: '#F9A8D4', position: [-0.05, 0.57, 0.12], rotation: [0, 0, 0.08], scale: [0.025, 0.16, 0.02] },
      { geometry: PRIM.box, color: '#F9A8D4', position: [0.05, 0.57, 0.12], rotation: [0, 0, -0.08], scale: [0.025, 0.16, 0.02] },
      { geometry: PRIM.sphere, color: '#F472B6', position: [0, 0.37, 0.25], scale: [0.03, 0.025, 0.025] },
      { geometry: PRIM.sphere, color: '#FFFFFF', position: [0, 0.18, -0.22], scale: [0.07, 0.07, 0.07] }
    );
  } else {
    // duckling
    parts.push(
      { geometry: PRIM.sphere, color: '#FACC15', position: [0, 0.19, 0], scale: [0.16, 0.14, 0.2] },
      { geometry: PRIM.sphere, color: '#FDE047', position: [0, 0.35, 0.12], scale: [0.12, 0.11, 0.12] },
      { geometry: PRIM.box, color: '#F97316', position: [0, 0.33, 0.24], scale: [0.1, 0.04, 0.1] },
      { geometry: PRIM.sphere, color: '#0F172A', position: [-0.05, 0.38, 0.21], scale: [0.02, 0.02, 0.02] },
      { geometry: PRIM.sphere, color: '#0F172A', position: [0.05, 0.38, 0.21], scale: [0.02, 0.02, 0.02] },
      { geometry: PRIM.box, color: '#EA580C', position: [-0.06, 0.04, 0.04], scale: [0.06, 0.08, 0.1] },
      { geometry: PRIM.box, color: '#EA580C', position: [0.06, 0.04, 0.04], scale: [0.06, 0.08, 0.1] }
    );
  }

  const merged = mergeColoredGeometries(parts);
  petGeometryCache.set(pet, merged);
  return merged;
}

export interface LotDecorProps {
  studentId: string;
  items: LotCustomization;
  jumpTriggerTimestamp?: number;
  isCalled?: boolean;
}

/**
 * Renders the private property plot (lawn, stone curb, walkway) and customizable items
 * (fence, tree, pet, sign) from `lotItemsCatalog`. Yard + static items take 1 merged draw call;
 * pets gently bob and jump in sync with awards/callouts via refs inside `useFrame` (Rule R4).
 */
export function LotDecor({
  studentId,
  items,
  jumpTriggerTimestamp = 0,
  isCalled = false,
}: LotDecorProps) {
  const yardGeom = getMergedYardGeometry(items);
  const petGeom = items.pet !== 'none' ? getMergedPetGeometry(items.pet) : null;

  const petRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => hashPhase(studentId), [studentId]);
  const jumpStartRef = useRef<number>(-999);
  const lastJumpPropRef = useRef<number>(jumpTriggerTimestamp);
  const prevCalledRef = useRef<boolean>(false);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    const awarded =
      jumpTriggerTimestamp > 0 &&
      jumpTriggerTimestamp !== lastJumpPropRef.current;
    const called = isCalled && !prevCalledRef.current;
    lastJumpPropRef.current = jumpTriggerTimestamp;
    prevCalledRef.current = isCalled;

    if (awarded || called) {
      jumpStartRef.current = -1;
    }
  }, [jumpTriggerTimestamp, isCalled]);

  useFrame(({ clock }) => {
    const pet = petRef.current;
    if (!pet) return;
    if (reducedMotion) {
      pet.position.y = 0.08;
      return;
    }

    const t = clock.elapsedTime;
    if (jumpStartRef.current === -1) {
      jumpStartRef.current = t;
    }
    const elapsed = t - jumpStartRef.current;
    if (elapsed >= 0 && elapsed < 1.1) {
      pet.position.y = 0.08 + Math.abs(Math.sin(elapsed * 10)) * 0.65;
      pet.rotation.y = 0.15 + elapsed * 5.7;
    } else {
      pet.position.y = 0.08 + Math.abs(Math.sin(t * 3.2 + phase)) * 0.07;
      pet.rotation.y = 0.15 + Math.sin(t * 1.4 + phase) * 0.22;
    }
  });

  return (
    <group name="LotDecor">
      <mesh geometry={yardGeom} material={YARD_MAT} receiveShadow />
      {petGeom && (
        <mesh
          ref={petRef}
          geometry={petGeom}
          material={PET_MAT}
          position={[1.52, 0.08, 2.26]}
          rotation={[0, 0.15, 0]}
          scale={[1.28, 1.28, 1.28]}
        />
      )}
    </group>
  );
}
