import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShopBranch } from '../../state/types';
import { ShopToppers } from './ShopToppers';

// Shared geometry cache across all 36-40 procedural shops (Rule 6.2 & 8.3)
const SHOP_GEOM = {
  foundation: new THREE.BoxGeometry(5.6, 0.28, 5.6),
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  awningStripe: new THREE.BoxGeometry(0.62, 0.16, 1.3),
  door: new THREE.BoxGeometry(1.1, 1.85, 0.12),
  glassWindow: new THREE.BoxGeometry(1.2, 1.1, 0.1),
  balconyRail: new THREE.BoxGeometry(4.4, 0.35, 0.9),
  signBoard: new THREE.BoxGeometry(2.6, 0.65, 0.18),
  dome: new THREE.SphereGeometry(1.65, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  crownSpire: new THREE.ConeGeometry(0.95, 1.8, 6),
  starOcta: new THREE.OctahedronGeometry(0.55, 0),
  auraRing: new THREE.RingGeometry(2.7, 3.05, 28),
  sideTreeTrunk: new THREE.CylinderGeometry(0.12, 0.16, 0.8, 8),
  sideTreeCrown: new THREE.ConeGeometry(0.55, 1.35, 8),
  lanternBulb: new THREE.SphereGeometry(0.16, 8, 8),
};

// Shared static materials
const STATIC_MAT = {
  foundation: new THREE.MeshStandardMaterial({ color: '#CBD5E1', roughness: 0.8 }),
  whiteTrim: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.5 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 }),
  doorWood: new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.6 }),
  glass: new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    emissive: '#38BDF8',
    emissiveIntensity: 0.22,
    roughness: 0.2,
    metalness: 0.3,
  }),
  signGold: new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    roughness: 0.35,
    metalness: 0.4,
  }),
  domeRoof: new THREE.MeshStandardMaterial({
    color: '#0D9488',
    roughness: 0.35,
    metalness: 0.2,
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
  treeTrunk: new THREE.MeshStandardMaterial({ color: '#92400E', roughness: 0.8 }),
  treeFoliage: new THREE.MeshStandardMaterial({ color: '#16A34A', roughness: 0.6 }),
  lantern: new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.7,
  }),
};

// Material cache indexed by normalized hex color (Rule 6.2)
const wallMaterialCache = new Map<string, THREE.MeshStandardMaterial>();
const roofMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getWallMaterial(hex: string): THREE.MeshStandardMaterial {
  const key = hex.toUpperCase();
  let mat = wallMaterialCache.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color: key,
      roughness: 0.55,
      metalness: 0.05,
    });
    wallMaterialCache.set(key, mat);
  }
  return mat;
}

function getRoofAccentMaterial(hex: string): THREE.MeshStandardMaterial {
  const key = hex.toUpperCase();
  let mat = roofMaterialCache.get(key);
  if (!mat) {
    const c = new THREE.Color(key).multiplyScalar(0.78);
    mat = new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.5,
      metalness: 0.1,
    });
    roofMaterialCache.set(key, mat);
  }
  return mat;
}

export interface ShopProceduralProps {
  level: number;
  color: string;
  branch: ShopBranch;
  castShadow?: boolean;
}

/**
 * Computes total building height smoothly across levels 1..20 (max ~13.6 at level 20).
 */
export function getProceduralShopHeight(level: number): number {
  const clamped = Math.min(20, Math.max(1, level));
  if (clamped <= 4) {
    // Tier 1 (Lv 1-4): Small stall 2.2 -> 3.2
    return 2.2 + (clamped - 1) * 0.33;
  }
  if (clamped <= 9) {
    // Tier 2 (Lv 5-9): 1-story solid shop 3.6 -> 5.2
    return 3.6 + (clamped - 5) * 0.4;
  }
  if (clamped <= 14) {
    // Tier 3 (Lv 10-14): 2-story building 5.8 -> 7.8
    return 5.8 + (clamped - 10) * 0.5;
  }
  if (clamped <= 19) {
    // Tier 4 (Lv 15-19): 3-story modern complex 8.5 -> 10.9
    return 8.5 + (clamped - 15) * 0.6;
  }
  // Tier 5 (Lv 20): 4-story Grand Commercial Tower (~12.4 body + spire/star <= 14)
  return 12.2;
}

/**
 * Procedural 3D shop with 5 distinct architectural tiers across levels 1-20 (Rule 6.2).
 */
export function ShopProcedural({
  level,
  color,
  branch,
  castShadow = true,
}: ShopProceduralProps) {
  const clampedLevel = Math.min(20, Math.max(1, level));
  const bodyHeight = getProceduralShopHeight(clampedLevel);
  const wallMat = getWallMaterial(color);
  const roofMat = getRoofAccentMaterial(color);

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

  const isTier1 = clampedLevel <= 4;
  const isTier2 = clampedLevel >= 5 && clampedLevel <= 9;
  const isTier3 = clampedLevel >= 10 && clampedLevel <= 14;
  const isTier4 = clampedLevel >= 15 && clampedLevel <= 19;
  const isTier5 = clampedLevel === 20;

  const width = isTier1 ? 3.6 : isTier2 ? 4.1 : 4.3;
  const depth = isTier1 ? 3.4 : isTier2 ? 3.8 : 4.1;
  const roofTopY = 0.28 + bodyHeight;

  return (
    <group>
      {/* Stone lot base */}
      <mesh
        geometry={SHOP_GEOM.foundation}
        material={STATIC_MAT.foundation}
        position={[0, 0.14, 0]}
        receiveShadow
      />

      {/* Main building body */}
      <mesh
        geometry={SHOP_GEOM.unitBox}
        material={wallMat}
        position={[0, 0.28 + bodyHeight / 2, 0]}
        scale={[width, bodyHeight, depth]}
        castShadow={castShadow}
        receiveShadow
      />

      {/* Roof cornice */}
      <mesh
        geometry={SHOP_GEOM.unitBox}
        material={roofMat}
        position={[0, roofTopY + 0.14, 0]}
        scale={[width + 0.3, 0.28, depth + 0.3]}
        castShadow={castShadow}
      />

      {/* Front entrance door (+Z face) */}
      <mesh
        geometry={SHOP_GEOM.door}
        material={STATIC_MAT.doorWood}
        position={[0, 0.28 + 0.92, depth / 2 + 0.04]}
      />

      {/* Tier 1 (Lv 1-4): Striped pastel + white awning stall */}
      {isTier1 && (
        <group position={[0, 0.28 + 1.95, depth / 2 + 0.48]} rotation={[0.25, 0, 0]}>
          {[-1.2, -0.6, 0, 0.6, 1.2].map((offsetX, i) => (
            <mesh
              key={offsetX}
              geometry={SHOP_GEOM.awningStripe}
              material={i % 2 === 0 ? roofMat : STATIC_MAT.whiteTrim}
              position={[offsetX, 0, 0]}
            />
          ))}
        </group>
      )}

      {/* Tier 2+ (Lv 5+): Glass display windows + 1 side tree */}
      {!isTier1 && (
        <>
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[-1.25, 0.28 + 1.25, depth / 2 + 0.03]}
          />
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[1.25, 0.28 + 1.25, depth / 2 + 0.03]}
          />
          {/* Right side decorative tree */}
          <group position={[2.35, 0.28, 1.4]}>
            <mesh
              geometry={SHOP_GEOM.sideTreeTrunk}
              material={STATIC_MAT.treeTrunk}
              position={[0, 0.4, 0]}
            />
            <mesh
              geometry={SHOP_GEOM.sideTreeCrown}
              material={STATIC_MAT.treeFoliage}
              position={[0, 1.15, 0]}
            />
          </group>
        </>
      )}

      {/* Tier 2 (Lv 5-9): Rooftop signboard */}
      {isTier2 && (
        <mesh
          geometry={SHOP_GEOM.signBoard}
          material={STATIC_MAT.signGold}
          position={[0, roofTopY + 0.55, depth / 2 - 0.35]}
        />
      )}

      {/* Tier 3+ (Lv 10+): 2nd floor windows, balcony, 2nd tree, decorative lanterns, rotating sign */}
      {(isTier3 || isTier4 || isTier5) && (
        <>
          {/* Balcony & upper windows */}
          <mesh
            geometry={SHOP_GEOM.balconyRail}
            material={STATIC_MAT.whiteTrim}
            position={[0, 0.28 + 3.2, depth / 2 + 0.32]}
          />
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[-1.15, 0.28 + 4.3, depth / 2 + 0.03]}
          />
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[1.15, 0.28 + 4.3, depth / 2 + 0.03]}
          />
          {/* Left side second decorative tree */}
          <group position={[-2.35, 0.28, 1.4]}>
            <mesh
              geometry={SHOP_GEOM.sideTreeTrunk}
              material={STATIC_MAT.treeTrunk}
              position={[0, 0.4, 0]}
            />
            <mesh
              geometry={SHOP_GEOM.sideTreeCrown}
              material={STATIC_MAT.treeFoliage}
              position={[0, 1.15, 0]}
            />
          </group>
          {/* Warm lanterns flanking entrance */}
          <mesh
            geometry={SHOP_GEOM.lanternBulb}
            material={STATIC_MAT.lantern}
            position={[-0.85, 0.28 + 2.1, depth / 2 + 0.22]}
          />
          <mesh
            geometry={SHOP_GEOM.lanternBulb}
            material={STATIC_MAT.lantern}
            position={[0.85, 0.28 + 2.1, depth / 2 + 0.22]}
          />
          {/* Gently rotating signboard */}
          <mesh
            ref={rotatingSignRef}
            geometry={SHOP_GEOM.signBoard}
            material={STATIC_MAT.signGold}
            position={[0, 0.28 + 3.5, depth / 2 + 0.55]}
          />
        </>
      )}

      {/* Tier 4 & 5 (Lv 15-20): 3rd floor windows + architectural dome */}
      {(isTier4 || isTier5) && (
        <>
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[-1.15, 0.28 + 7.1, depth / 2 + 0.03]}
          />
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[1.15, 0.28 + 7.1, depth / 2 + 0.03]}
          />
          <mesh
            geometry={SHOP_GEOM.dome}
            material={STATIC_MAT.domeRoof}
            position={[0, roofTopY + 0.28, 0]}
          />
        </>
      )}

      {/* Tier 5 (Lv 20): 4th floor windows + golden crown spire + rotating star + ground aura ring */}
      {isTier5 && (
        <>
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[-1.15, 0.28 + 9.8, depth / 2 + 0.03]}
          />
          <mesh
            geometry={SHOP_GEOM.glassWindow}
            material={STATIC_MAT.glass}
            position={[1.15, 0.28 + 9.8, depth / 2 + 0.03]}
          />
          <mesh
            ref={level20StarRef}
            geometry={SHOP_GEOM.starOcta}
            material={STATIC_MAT.goldStar}
            position={[0, roofTopY + 2.35, 0]}
          />
          <mesh
            geometry={SHOP_GEOM.auraRing}
            material={STATIC_MAT.aura}
            position={[0, 0.05, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        </>
      )}

      {/* Branch Topper anchored on top of the shop */}
      <ShopToppers
        branch={branch}
        position={[
          0,
          isTier4 || isTier5 ? roofTopY + 1.85 : roofTopY + 0.28,
          0,
        ]}
      />
    </group>
  );
}
