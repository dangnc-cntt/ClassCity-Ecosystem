import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import type { ShopBranch } from '../../state/types';
import { buildTopperParts } from './ShopToppers';

// Shared primitive templates across all procedural shop tiers (Rule 6.2 & 8.3)
const SHOP_GEOM = {
  foundation: new THREE.BoxGeometry(5.0, 0.28, 4.8),
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  awningStripe: new THREE.BoxGeometry(0.62, 0.16, 1.3),
  door: new THREE.BoxGeometry(1.1, 1.85, 0.12),
  glassWindow: new THREE.BoxGeometry(1.2, 1.1, 0.1),
  balconyRail: new THREE.BoxGeometry(4.4, 0.35, 0.9),
  signBoard: new THREE.BoxGeometry(2.6, 0.65, 0.18),
  dome: new THREE.SphereGeometry(1.65, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  starOcta: new THREE.OctahedronGeometry(0.55, 0),
  auraRing: new THREE.RingGeometry(2.7, 3.05, 28),
  lanternBulb: new THREE.SphereGeometry(0.16, 8, 8),
};

const SHOP_VERTEX_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.5,
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

function getMergedShopGeometry(
  clampedLevel: number,
  branch: ShopBranch,
  hexColor: string
): THREE.BufferGeometry {
  const normColor = hexColor.toUpperCase();
  const key = `${clampedLevel}|${branch}|${normColor}`;
  const cached = mergedShopCache.get(key);
  if (cached) {
    // Refresh LRU order
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
  const roofColor = `#${new THREE.Color(normColor).multiplyScalar(0.78).getHexString()}`;

  const parts: ColoredPartSpec[] = [
    // Stone foundation
    {
      geometry: SHOP_GEOM.foundation,
      color: '#CBD5E1',
      position: [0, 0.14, 0],
    },
    // Pastel main body
    {
      geometry: SHOP_GEOM.unitBox,
      color: normColor,
      position: [0, 0.28 + bodyHeight / 2, 0],
      scale: [width, bodyHeight, depth],
    },
    // Roof cornice
    {
      geometry: SHOP_GEOM.unitBox,
      color: roofColor,
      position: [0, roofTopY + 0.14, 0],
      scale: [width + 0.3, 0.28, depth + 0.3],
    },
    // Front wooden door
    {
      geometry: SHOP_GEOM.door,
      color: '#78350F',
      position: [0, 0.28 + 0.92, depth / 2 + 0.04],
    },
  ];

  // Tier 1 (Lv 1-4): Striped awning stall
  if (isTier1) {
    const offsets = [-1.2, -0.6, 0, 0.6, 1.2];
    for (let i = 0; i < offsets.length; i += 1) {
      parts.push({
        geometry: SHOP_GEOM.awningStripe,
        color: i % 2 === 0 ? roofColor : '#F8FAFC',
        position: [offsets[i]!, 0.28 + 1.95, depth / 2 + 0.48],
        rotation: [0.25, 0, 0],
      });
    }
  }

  // Tier 2+ (Lv 5+): Glass display windows (yard trees are customizable items via LotDecor)
  if (!isTier1) {
    parts.push(
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [-1.25, 0.28 + 1.25, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [1.25, 0.28 + 1.25, depth / 2 + 0.03],
      }
    );
  }

  // Tier 2 & Tier 3 (Lv 5-14): Static golden signboard baked into merged mesh
  if (isTier2) {
    parts.push({
      geometry: SHOP_GEOM.signBoard,
      color: '#FBBF24',
      position: [0, roofTopY + 0.55, depth / 2 - 0.35],
    });
  }
  if (isTier3) {
    parts.push({
      geometry: SHOP_GEOM.signBoard,
      color: '#FBBF24',
      position: [0, 0.28 + 3.5, depth / 2 + 0.55],
    });
  }

  // Tier 3+ (Lv 10+): Balcony, 2nd floor windows, warm entrance lanterns
  if (isTier3 || isTier4 || isTier5) {
    parts.push(
      {
        geometry: SHOP_GEOM.balconyRail,
        color: '#F8FAFC',
        position: [0, 0.28 + 3.2, depth / 2 + 0.32],
      },
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [-1.15, 0.28 + 4.3, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [1.15, 0.28 + 4.3, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.lanternBulb,
        color: '#FDE047',
        position: [-0.85, 0.28 + 2.1, depth / 2 + 0.22],
      },
      {
        geometry: SHOP_GEOM.lanternBulb,
        color: '#FDE047',
        position: [0.85, 0.28 + 2.1, depth / 2 + 0.22],
      }
    );
  }

  // Tier 4 & 5 (Lv 15-20): 3rd floor windows + architectural dome
  if (isTier4 || isTier5) {
    parts.push(
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [-1.15, 0.28 + 7.1, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [1.15, 0.28 + 7.1, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.dome,
        color: '#0D9488',
        position: [0, roofTopY + 0.28, 0],
      }
    );
  }

  // Tier 5 (Lv 20): 4th floor windows
  if (isTier5) {
    parts.push(
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [-1.15, 0.28 + 9.8, depth / 2 + 0.03],
      },
      {
        geometry: SHOP_GEOM.glassWindow,
        color: '#7DD3FC',
        position: [1.15, 0.28 + 9.8, depth / 2 + 0.03],
      }
    );
  }

  // Bake rooftop branch topper directly into the merged shop mesh (0 extra draw calls)
  const topperBaseY = isTier4 || isTier5 ? roofTopY + 1.85 : roofTopY + 0.28;
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
 * Static façade + rooftop topper are merged into 1 vertex-colored mesh per `(level, branch, color)`
 * while animated Tier 3+ signboards and Lv 20 golden stars rotate smoothly.
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
          position={[0, 0.28 + 3.5, depth / 2 + 0.55]}
        />
      )}

      {isTier5 && (
        <>
          <mesh
            ref={level20StarRef}
            geometry={SHOP_GEOM.starOcta}
            material={ANIMATED_MAT.goldStar}
            position={[0, roofTopY + 2.35, 0]}
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
