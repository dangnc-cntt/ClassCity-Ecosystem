import * as THREE from 'three';
import type { ShopBranch } from '../../state/types';

// Module-level shared geometries & materials for zero-overhead instancing/reuse (Rule 6.2 & 8.3)
const TOPPER_GEOM = {
  cakeBase: new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16),
  cakeFrosting: new THREE.CylinderGeometry(0.45, 0.45, 0.25, 16),
  cherry: new THREE.SphereGeometry(0.14, 12, 12),
  cupBody: new THREE.CylinderGeometry(0.42, 0.32, 0.55, 16),
  cupSaucer: new THREE.CylinderGeometry(0.62, 0.55, 0.08, 16),
  cupHandle: new THREE.TorusGeometry(0.16, 0.05, 8, 16),
  steamPuff: new THREE.SphereGeometry(0.12, 8, 8),
  bookCoverLeft: new THREE.BoxGeometry(0.55, 0.08, 0.72),
  bookPageBlock: new THREE.BoxGeometry(0.48, 0.12, 0.66),
  catHead: new THREE.SphereGeometry(0.42, 14, 14),
  catEar: new THREE.ConeGeometry(0.18, 0.32, 4),
  gamepadBody: new THREE.BoxGeometry(0.95, 0.42, 0.22),
  gamepadBtn: new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12),
  pedestal: new THREE.CylinderGeometry(0.5, 0.6, 0.14, 12),
};

const TOPPER_MAT = {
  pedestal: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 }),
  cream: new THREE.MeshStandardMaterial({ color: '#FFFBEB', roughness: 0.4 }),
  strawberry: new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.4 }),
  cherryRed: new THREE.MeshStandardMaterial({
    color: '#E11D48',
    emissive: '#881337',
    emissiveIntensity: 0.25,
    roughness: 0.3,
  }),
  coffeeCup: new THREE.MeshStandardMaterial({ color: '#FEF3C7', roughness: 0.3 }),
  coffeeLiquid: new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.5 }),
  steam: new THREE.MeshBasicMaterial({
    color: '#F8FAFC',
    transparent: true,
    opacity: 0.65,
  }),
  bookCover: new THREE.MeshStandardMaterial({ color: '#2563EB', roughness: 0.5 }),
  bookPages: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.7 }),
  catBody: new THREE.MeshStandardMaterial({ color: '#F472B6', roughness: 0.4 }),
  catInner: new THREE.MeshStandardMaterial({ color: '#FBCFE8', roughness: 0.4 }),
  gamepadShell: new THREE.MeshStandardMaterial({
    color: '#6366F1',
    roughness: 0.35,
  }),
  gamepadNeonA: new THREE.MeshStandardMaterial({
    color: '#22D3EE',
    emissive: '#0891B2',
    emissiveIntensity: 0.5,
  }),
  gamepadNeonB: new THREE.MeshStandardMaterial({
    color: '#F43F5E',
    emissive: '#BE123C',
    emissiveIntensity: 0.5,
  }),
};

export interface ShopToppersProps {
  branch: ShopBranch;
  position?: [number, number, number];
}

/**
 * Renders the 3D rooftop emblem for each shop branch (Rule 6.2).
 * Uses shared geometries and materials across all 36-40 lots.
 */
export function ShopToppers({
  branch,
  position = [0, 0, 0],
}: ShopToppersProps) {
  return (
    <group name="Anchor_Topper" position={position}>
      {/* Shared mounting pedestal */}
      <mesh
        geometry={TOPPER_GEOM.pedestal}
        material={TOPPER_MAT.pedestal}
        position={[0, 0.07, 0]}
      />

      {branch === 'bakery' && (
        <group position={[0, 0.14, 0]}>
          <mesh
            geometry={TOPPER_GEOM.cakeBase}
            material={TOPPER_MAT.strawberry}
            position={[0, 0.18, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.cakeFrosting}
            material={TOPPER_MAT.cream}
            position={[0, 0.44, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.cherry}
            material={TOPPER_MAT.cherryRed}
            position={[0, 0.64, 0]}
          />
        </group>
      )}

      {branch === 'cafe' && (
        <group position={[0, 0.14, 0]}>
          <mesh
            geometry={TOPPER_GEOM.cupSaucer}
            material={TOPPER_MAT.coffeeCup}
            position={[0, 0.04, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.cupBody}
            material={TOPPER_MAT.coffeeCup}
            position={[0, 0.32, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.cupHandle}
            material={TOPPER_MAT.coffeeCup}
            position={[0.4, 0.34, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.steamPuff}
            material={TOPPER_MAT.steam}
            position={[-0.1, 0.74, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.steamPuff}
            material={TOPPER_MAT.steam}
            position={[0.12, 0.92, 0]}
            scale={[0.8, 0.8, 0.8]}
          />
        </group>
      )}

      {branch === 'bookstore' && (
        <group position={[0, 0.28, 0]}>
          <group position={[-0.24, 0.08, 0]} rotation={[0, 0, 0.25]}>
            <mesh
              geometry={TOPPER_GEOM.bookCoverLeft}
              material={TOPPER_MAT.bookCover}
            />
            <mesh
              geometry={TOPPER_GEOM.bookPageBlock}
              material={TOPPER_MAT.bookPages}
              position={[0, 0.07, 0]}
            />
          </group>
          <group position={[0.24, 0.08, 0]} rotation={[0, 0, -0.25]}>
            <mesh
              geometry={TOPPER_GEOM.bookCoverLeft}
              material={TOPPER_MAT.bookCover}
            />
            <mesh
              geometry={TOPPER_GEOM.bookPageBlock}
              material={TOPPER_MAT.bookPages}
              position={[0, 0.07, 0]}
            />
          </group>
        </group>
      )}

      {branch === 'petshop' && (
        <group position={[0, 0.14, 0]}>
          <mesh
            geometry={TOPPER_GEOM.catHead}
            material={TOPPER_MAT.catBody}
            position={[0, 0.38, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.catEar}
            material={TOPPER_MAT.catInner}
            position={[-0.24, 0.76, 0]}
            rotation={[0, 0, 0.25]}
          />
          <mesh
            geometry={TOPPER_GEOM.catEar}
            material={TOPPER_MAT.catInner}
            position={[0.24, 0.76, 0]}
            rotation={[0, 0, -0.25]}
          />
        </group>
      )}

      {branch === 'gamecenter' && (
        <group position={[0, 0.42, 0]} rotation={[0.2, 0, 0]}>
          <mesh
            geometry={TOPPER_GEOM.gamepadBody}
            material={TOPPER_MAT.gamepadShell}
          />
          <mesh
            geometry={TOPPER_GEOM.gamepadBtn}
            material={TOPPER_MAT.gamepadNeonA}
            position={[-0.24, 0.05, 0.12]}
            rotation={[Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={TOPPER_GEOM.gamepadBtn}
            material={TOPPER_MAT.gamepadNeonB}
            position={[0.24, 0.05, 0.12]}
            rotation={[Math.PI / 2, 0, 0]}
          />
        </group>
      )}
    </group>
  );
}
