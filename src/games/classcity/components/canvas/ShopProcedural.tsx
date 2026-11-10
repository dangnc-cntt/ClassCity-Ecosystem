import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import type { ShopBranch } from '../../state/types';
import { buildTopperParts } from './ShopToppers';

const SQRT2 = Math.SQRT2;

// Branch-harmonized roof palette so neighboring Tier 4-5 towers have distinct silhouettes & hues
const BRANCH_ACCENT_COLOR: Record<ShopBranch, string> = {
  bakery: '#DB2777',
  cafe: '#B45309',
  bookstore: '#1D4ED8',
  petshop: '#0F766E',
  gamecenter: '#6D28D9',
};

// Shared primitive templates across all procedural shop tiers (Rule 6.2 & 8.3)
const SHOP_GEOM = {
  foundation: new THREE.BoxGeometry(5.0, 0.28, 4.8),
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  awningStripe: new THREE.BoxGeometry(0.62, 0.16, 1.3),
  door: new THREE.BoxGeometry(1.06, 1.82, 0.1),
  doorFrame: new THREE.BoxGeometry(1.28, 1.98, 0.08),
  doorStep: new THREE.BoxGeometry(1.55, 0.14, 0.55),
  glassWindow: new THREE.BoxGeometry(1.08, 0.96, 0.06),
  windowFrame: new THREE.BoxGeometry(1.24, 1.12, 0.05),
  windowSill: new THREE.BoxGeometry(1.32, 0.1, 0.16),
  balconyRail: new THREE.BoxGeometry(4.4, 0.32, 0.92),
  signBoard: new THREE.BoxGeometry(2.6, 0.65, 0.18),
  mansard: new THREE.CylinderGeometry(0.72, 1.0, 1, 4, 1),
  dome: new THREE.SphereGeometry(1.55, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  starOcta: new THREE.OctahedronGeometry(0.55, 0),
  auraRing: new THREE.RingGeometry(2.7, 3.05, 28),
  lanternBulb: new THREE.SphereGeometry(0.16, 8, 8),
};

const SHOP_VERTEX_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.48,
  metalness: 0.08,
});

const ANIMATED_MAT = {
  signGold: new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    roughness: 0.35,
    metalness: 0.4,
  }),
  goldStar: new THREE.MeshStandardMaterial({
    color: '#FDE047',
    emissive: '#F59E0B',
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.6,
  }),
  aura: new THREE.MeshBasicMaterial({
    color: '#FDE047',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  }),
};

// Bounded LRU cache for merged shop geometries so recoloring never leaks GPU memory (Rule 8.9)
const MAX_SHOP_GEOM_CACHE = 128;
const mergedShopCache = new Map<string, THREE.BufferGeometry>();

/**
 * Computes total building height smoothly across levels 1..20 (max ~13.6 at level 20).
 */
export function getProceduralShopHeight(level: number): number {
  const clamped = Math.min(20, Math.max(1, level));
  if (clamped <= 4) {
    return 2.2 + (clamped - 1) * 0.33;
  }
  if (clamped <= 9) {
    return 3.6 + (clamped - 5) * 0.4;
  }
  if (clamped <= 14) {
    return 5.8 + (clamped - 10) * 0.5;
  }
  if (clamped <= 19) {
    return 8.5 + (clamped - 15) * 0.6;
  }
  return 12.2;
}

function pushFramedWindow(
  parts: ColoredPartSpec[],
  x: number,
  y: number,
  z: number,
  rotY = 0,
  warmLit = false,
  scaleFactor = 1
): void {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const offset = (d: number): [number, number, number] => [
    x + sin * d,
    y,
    z + cos * d,
  ];
  parts.push(
    {
      geometry: SHOP_GEOM.windowFrame,
      color: '#F8FAFC',
      position: offset(0.01),
      rotation: [0, rotY, 0],
      scale: [scaleFactor, scaleFactor, 1],
    },
    {
      geometry: SHOP_GEOM.glassWindow,
      color: warmLit ? '#FDE68A' : '#7DD3FC',
      position: offset(0.04),
      rotation: [0, rotY, 0],
      scale: [scaleFactor, scaleFactor, 1],
    },
    {
      geometry: SHOP_GEOM.windowSill,
      color: '#CBD5E1',
      position: [x + sin * 0.06, y - 0.54 * scaleFactor, z + cos * 0.06],
      rotation: [0, rotY, 0],
      scale: [scaleFactor, 1, 1],
    }
  );
}

function getMergedShopGeometry(
  clampedLevel: number,
  branch: ShopBranch,
  hexColor: string
): THREE.BufferGeometry {
  const normColor = hexColor.toUpperCase();
  const key = `v2|${clampedLevel}|${branch}|${normColor}`;
  const cached = mergedShopCache.get(key);
  if (cached) {
    mergedShopCache.delete(key);
    mergedShopCache.set(key, cached);
    return cached;
  }

  const bodyHeight = getProceduralShopHeight(clampedLevel);
  const isTier1 = clampedLevel <= 4;
  const isTier2 = clampedLevel >= 5 && clampedLevel <= 9;
  const isTier3 = clampedLevel >= 10 && clampedLevel <= 14;
  const isTier4 = clampedLevel >= 15 && clampedLevel <= 19;
  const isTier5 = clampedLevel === 20;

  const width = isTier1 ? 3.6 : isTier2 ? 4.1 : 4.3;
  const depth = isTier1 ? 3.4 : isTier2 ? 3.8 : 4.1;
  const roofTopY = 0.28 + bodyHeight;
  const roofColor = `#${new THREE.Color(normColor).multiplyScalar(0.76).getHexString()}`;
  const branchRoof = BRANCH_ACCENT_COLOR[branch];

  const parts: ColoredPartSpec[] = [
    // Stone foundation plinth
    {
      geometry: SHOP_GEOM.foundation,
      color: '#CBD5E1',
      position: [0, 0.14, 0],
    },
    // Welcome front step & threshold mat
    {
      geometry: SHOP_GEOM.doorStep,
      color: '#E2E8F0',
      position: [0, 0.28, depth / 2 + 0.24],
    },
    {
      geometry: SHOP_GEOM.unitBox,
      color: branchRoof,
      position: [0, 0.36, depth / 2 + 0.28],
      scale: [1.1, 0.03, 0.36],
    },
    // Pastel main building body
    {
      geometry: SHOP_GEOM.unitBox,
      color: normColor,
      position: [0, 0.28 + bodyHeight / 2, 0],
      scale: [width, bodyHeight, depth],
    },
    // Roof cornice overhang
    {
      geometry: SHOP_GEOM.unitBox,
      color: '#F8FAFC',
      position: [0, roofTopY + 0.11, 0],
      scale: [width + 0.36, 0.22, depth + 0.36],
    },
    // Framed entrance door (+Z face)
    {
      geometry: SHOP_GEOM.doorFrame,
      color: '#F8FAFC',
      position: [0, 0.28 + 0.99, depth / 2 + 0.02],
    },
    {
      geometry: SHOP_GEOM.door,
      color: '#78350F',
      position: [0, 0.28 + 0.94, depth / 2 + 0.06],
    },
    {
      geometry: SHOP_GEOM.lanternBulb,
      color: '#FBBF24',
      position: [0.34, 0.28 + 0.95, depth / 2 + 0.12],
      scale: [0.45, 0.45, 0.45],
    },
  ];

  // Corner pilasters + horizontal floor moldings on Tier 2+ buildings so walls have crisp depth
  if (!isTier1) {
    const px = width / 2 - 0.06;
    const pz = depth / 2 - 0.06;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        parts.push({
          geometry: SHOP_GEOM.unitBox,
          color: '#F8FAFC',
          position: [sx * px, 0.28 + bodyHeight / 2, sz * pz],
          scale: [0.22, bodyHeight, 0.22],
        });
      }
    }
  }

  // Tier 1 (Lv 1-4): Cute striped awning + warm pitched roof cap
  if (isTier1) {
    const offsets = [-1.2, -0.6, 0, 0.6, 1.2];
    for (let i = 0; i < offsets.length; i += 1) {
      parts.push({
        geometry: SHOP_GEOM.awningStripe,
        color: i % 2 === 0 ? branchRoof : '#F8FAFC',
        position: [offsets[i]!, 0.28 + 1.96, depth / 2 + 0.48],
        rotation: [0.25, 0, 0],
      });
    }
    parts.push({
      geometry: SHOP_GEOM.mansard,
      color: roofColor,
      position: [0, roofTopY + 0.48, 0],
      rotation: [0, Math.PI / 4, 0],
      scale: [(width + 0.2) / SQRT2, 0.56, (depth + 0.2) / SQRT2],
    });
  }

  // Tier 2+ (Lv 5+): Framed front + side display windows & ground-floor canopy
  if (!isTier1) {
    pushFramedWindow(parts, -1.25, 0.28 + 1.28, depth / 2, 0, false);
    pushFramedWindow(parts, 1.25, 0.28 + 1.28, depth / 2, 0, true);
    // Side windows on left & right walls for 360-degree camera appeal
    pushFramedWindow(parts, -width / 2, 0.28 + 1.4, 0, -Math.PI / 2, false, 0.85);
    pushFramedWindow(parts, width / 2, 0.28 + 1.4, 0, Math.PI / 2, true, 0.85);
  }

  let roofHeightAboveCornice = 0.24;

  // Tier 2 (Lv 5-9): Sloped mansard roof + wooden rooftop signboard
  if (isTier2) {
    parts.push(
      {
        geometry: SHOP_GEOM.mansard,
        color: branchRoof,
        position: [0, roofTopY + 0.55, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [(width + 0.24) / SQRT2, 0.72, (depth + 0.24) / SQRT2],
      },
      {
        geometry: SHOP_GEOM.signBoard,
        color: '#FBBF24',
        position: [0, roofTopY + 0.55, depth / 2 - 0.18],
      }
    );
    roofHeightAboveCornice = 0.92;
  }

  // Tier 3+ (Lv 10+): Balcony railing with posts, floor belt course, 2nd floor windows, entrance lanterns
  if (isTier3 || isTier4 || isTier5) {
    parts.push(
      {
        geometry: SHOP_GEOM.unitBox,
        color: '#E2E8F0',
        position: [0, 0.28 + 2.85, 0],
        scale: [width + 0.24, 0.16, depth + 0.24],
      },
      {
        geometry: SHOP_GEOM.balconyRail,
        color: '#F8FAFC',
        position: [0, 0.28 + 3.22, depth / 2 + 0.34],
      },
      {
        geometry: SHOP_GEOM.unitBox,
        color: branchRoof,
        position: [0, 0.28 + 3.4, depth / 2 + 0.78],
        scale: [4.45, 0.08, 0.08],
      },
      {
        geometry: SHOP_GEOM.lanternBulb,
        color: '#FDE047',
        position: [-0.85, 0.28 + 2.15, depth / 2 + 0.22],
      },
      {
        geometry: SHOP_GEOM.lanternBulb,
        color: '#FDE047',
        position: [0.85, 0.28 + 2.15, depth / 2 + 0.22],
      }
    );
    pushFramedWindow(parts, -1.15, 0.28 + 4.35, depth / 2, 0, true);
    pushFramedWindow(parts, 1.15, 0.28 + 4.35, depth / 2, 0, false);
    pushFramedWindow(parts, -width / 2, 0.28 + 4.35, 0, -Math.PI / 2, true, 0.82);
    pushFramedWindow(parts, width / 2, 0.28 + 4.35, 0, Math.PI / 2, false, 0.82);
  }

  if (isTier3) {
    parts.push(
      {
        geometry: SHOP_GEOM.signBoard,
        color: '#FBBF24',
        position: [0, 0.28 + 3.55, depth / 2 + 0.56],
      },
      {
        geometry: SHOP_GEOM.mansard,
        color: branchRoof,
        position: [0, roofTopY + 0.62, 0],
        rotation: [0, Math.PI / 4, 0],
        scale: [(width + 0.24) / SQRT2, 0.85, (depth + 0.24) / SQRT2],
      }
    );
    roofHeightAboveCornice = 1.05;
  }

  // Tier 4 & 5 (Lv 15-20): 3rd floor windows, belt course, upper setback crown & branch-tinted dome
  if (isTier4 || isTier5) {
    parts.push(
      {
        geometry: SHOP_GEOM.unitBox,
        color: '#E2E8F0',
        position: [0, 0.28 + 5.7, 0],
        scale: [width + 0.22, 0.16, depth + 0.22],
      },
      // Decorative top setback parapet below the dome
      {
        geometry: SHOP_GEOM.unitBox,
        color: roofColor,
        position: [0, roofTopY + 0.36, 0],
        scale: [width - 0.8, 0.34, depth - 0.8],
      },
      {
        geometry: SHOP_GEOM.dome,
        color: branchRoof,
        position: [0, roofTopY + 0.52, 0],
      }
    );
    pushFramedWindow(parts, -1.15, 0.28 + 7.1, depth / 2, 0, false);
    pushFramedWindow(parts, 1.15, 0.28 + 7.1, depth / 2, 0, true);
    pushFramedWindow(parts, -width / 2, 0.28 + 7.1, 0, -Math.PI / 2, false, 0.8);
    pushFramedWindow(parts, width / 2, 0.28 + 7.1, 0, Math.PI / 2, true, 0.8);
    roofHeightAboveCornice = 1.96;
  }

  // Tier 5 (Lv 20): 4th floor windows + golden belt accent
  if (isTier5) {
    parts.push({
      geometry: SHOP_GEOM.unitBox,
      color: '#FBBF24',
      position: [0, 0.28 + 8.5, 0],
      scale: [width + 0.26, 0.16, depth + 0.26],
    });
    pushFramedWindow(parts, -1.15, 0.28 + 9.9, depth / 2, 0, true);
    pushFramedWindow(parts, 1.15, 0.28 + 9.9, depth / 2, 0, true);
    pushFramedWindow(parts, -width / 2, 0.28 + 9.9, 0, -Math.PI / 2, true, 0.8);
    pushFramedWindow(parts, width / 2, 0.28 + 9.9, 0, Math.PI / 2, false, 0.8);
  }

  // Bake rooftop branch topper neatly onto the roof apex (0 extra draw calls)
  const topperBaseY = isTier1
    ? roofTopY + 0.72
    : roofTopY + roofHeightAboveCornice;
  parts.push(...buildTopperParts(branch, topperBaseY));

  const merged = mergeColoredGeometries(parts);
  if (mergedShopCache.size >= MAX_SHOP_GEOM_CACHE) {
    const oldestKey = mergedShopCache.keys().next().value;
    if (oldestKey !== undefined) {
      mergedShopCache.get(oldestKey)?.dispose();
      mergedShopCache.delete(oldestKey);
    }
  }
  mergedShopCache.set(key, merged);
  return merged;
}

export interface ShopProceduralProps {
  level: number;
  color: string;
  branch: ShopBranch;
  castShadow?: boolean;
}

/**
 * Procedural 3D shop with 5 distinct architectural tiers across levels 1-20 (Rule 6.2 & 8.9).
 * Includes framed 3D windows with sills, corner pilasters, branch-harmonized roofs,
 * and baked toppers inside 1 draw call per `(level, branch, color)` variant.
 */
export function ShopProcedural({
  level,
  color,
  branch,
  castShadow = true,
}: ShopProceduralProps) {
  const clampedLevel = Math.min(20, Math.max(1, level));
  const bodyHeight = getProceduralShopHeight(clampedLevel);
  const mergedGeometry = getMergedShopGeometry(clampedLevel, branch, color);

  const rotatingSignRef = useRef<THREE.Mesh>(null);
  const level20StarRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rotatingSignRef.current) {
      rotatingSignRef.current.rotation.y = Math.sin(t * 1.4) * 0.35;
    }
    if (level20StarRef.current) {
      level20StarRef.current.rotation.y = t * 1.8;
    }
  });

  const isTier4Plus = clampedLevel >= 15;
  const isTier5 = clampedLevel === 20;
  const depth = clampedLevel <= 4 ? 3.4 : clampedLevel <= 9 ? 3.8 : 4.1;
  const roofTopY = 0.28 + bodyHeight;

  return (
    <group>
      <mesh
        geometry={mergedGeometry}
        material={SHOP_VERTEX_MAT}
        castShadow={castShadow}
        receiveShadow
      />

      {isTier4Plus && (
        <mesh
          ref={rotatingSignRef}
          geometry={SHOP_GEOM.signBoard}
          material={ANIMATED_MAT.signGold}
          position={[0, 0.28 + 3.55, depth / 2 + 0.56]}
        />
      )}

      {isTier5 && (
        <>
          <mesh
            ref={level20StarRef}
            geometry={SHOP_GEOM.starOcta}
            material={ANIMATED_MAT.goldStar}
            position={[0, roofTopY + 3.35, 0]}
          />
          <mesh
            geometry={SHOP_GEOM.auraRing}
            material={ANIMATED_MAT.aura}
            position={[0, 0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </>
      )}
    </group>
  );
}
