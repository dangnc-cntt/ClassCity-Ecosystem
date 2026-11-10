import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';
import type { ShopBranch } from '../../state/types';

// Module-level primitive templates for building single-mesh rooftop emblems (Rule 6.2 & 8.3)
const TOPPER_PRIM = {
  pedestal: new THREE.CylinderGeometry(0.5, 0.6, 0.14, 12),
  cakeBase: new THREE.CylinderGeometry(0.55, 0.55, 0.35, 16),
  cakeFrosting: new THREE.CylinderGeometry(0.45, 0.45, 0.25, 16),
  cherry: new THREE.SphereGeometry(0.14, 12, 12),
  cupBody: new THREE.CylinderGeometry(0.42, 0.32, 0.55, 16),
  cupSaucer: new THREE.CylinderGeometry(0.62, 0.55, 0.08, 16),
  cupHandle: new THREE.TorusGeometry(0.16, 0.05, 8, 16),
  steamPuff: new THREE.SphereGeometry(0.12, 8, 8),
  bookCover: new THREE.BoxGeometry(0.55, 0.08, 0.72),
  bookPages: new THREE.BoxGeometry(0.48, 0.12, 0.66),
  catHead: new THREE.SphereGeometry(0.42, 14, 14),
  catEar: new THREE.ConeGeometry(0.18, 0.32, 4),
  gamepadBody: new THREE.BoxGeometry(0.95, 0.42, 0.22),
  gamepadBtn: new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12),
};

const TOPPER_VERTEX_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.42,
  metalness: 0.1,
});

/**
 * Generates colored primitive descriptors for a branch rooftop emblem offset by `baseY`,
 * allowing both standalone `<ShopToppers>` (for `.glb` `Anchor_Topper`) and zero-extra-draw-call
 * baking inside `ShopProcedural`.
 */
export function buildTopperParts(
  branch: ShopBranch,
  baseY = 0
): ColoredPartSpec[] {
  const parts: ColoredPartSpec[] = [
    {
      geometry: TOPPER_PRIM.pedestal,
      color: '#334155',
      position: [0, baseY + 0.07, 0],
    },
  ];

  if (branch === 'bakery') {
    parts.push(
      {
        geometry: TOPPER_PRIM.cakeBase,
        color: '#FB7185',
        position: [0, baseY + 0.32, 0],
      },
      {
        geometry: TOPPER_PRIM.cakeFrosting,
        color: '#FFFBEB',
        position: [0, baseY + 0.58, 0],
      },
      {
        geometry: TOPPER_PRIM.cherry,
        color: '#E11D48',
        position: [0, baseY + 0.78, 0],
      }
    );
  } else if (branch === 'cafe') {
    parts.push(
      {
        geometry: TOPPER_PRIM.cupSaucer,
        color: '#FEF3C7',
        position: [0, baseY + 0.18, 0],
      },
      {
        geometry: TOPPER_PRIM.cupBody,
        color: '#FEF3C7',
        position: [0, baseY + 0.46, 0],
      },
      {
        geometry: TOPPER_PRIM.cupHandle,
        color: '#FEF3C7',
        position: [0.4, baseY + 0.48, 0],
      },
      {
        geometry: TOPPER_PRIM.steamPuff,
        color: '#F8FAFC',
        position: [-0.1, baseY + 0.88, 0],
      },
      {
        geometry: TOPPER_PRIM.steamPuff,
        color: '#F8FAFC',
        position: [0.12, baseY + 1.06, 0],
        scale: [0.8, 0.8, 0.8],
      }
    );
  } else if (branch === 'bookstore') {
    parts.push(
      {
        geometry: TOPPER_PRIM.bookCover,
        color: '#2563EB',
        position: [-0.24, baseY + 0.36, 0],
        rotation: [0, 0, 0.25],
      },
      {
        geometry: TOPPER_PRIM.bookPages,
        color: '#F8FAFC',
        position: [-0.22, baseY + 0.43, 0],
        rotation: [0, 0, 0.25],
      },
      {
        geometry: TOPPER_PRIM.bookCover,
        color: '#2563EB',
        position: [0.24, baseY + 0.36, 0],
        rotation: [0, 0, -0.25],
      },
      {
        geometry: TOPPER_PRIM.bookPages,
        color: '#F8FAFC',
        position: [0.22, baseY + 0.43, 0],
        rotation: [0, 0, -0.25],
      }
    );
  } else if (branch === 'petshop') {
    parts.push(
      {
        geometry: TOPPER_PRIM.catHead,
        color: '#F472B6',
        position: [0, baseY + 0.52, 0],
      },
      {
        geometry: TOPPER_PRIM.catEar,
        color: '#FBCFE8',
        position: [-0.24, baseY + 0.9, 0],
        rotation: [0, 0, 0.25],
      },
      {
        geometry: TOPPER_PRIM.catEar,
        color: '#FBCFE8',
        position: [0.24, baseY + 0.9, 0],
        rotation: [0, 0, -0.25],
      }
    );
  } else {
    parts.push(
      {
        geometry: TOPPER_PRIM.gamepadBody,
        color: '#6366F1',
        position: [0, baseY + 0.42, 0],
        rotation: [0.2, 0, 0],
      },
      {
        geometry: TOPPER_PRIM.gamepadBtn,
        color: '#22D3EE',
        position: [-0.24, baseY + 0.47, 0.12],
        rotation: [Math.PI / 2 + 0.2, 0, 0],
      },
      {
        geometry: TOPPER_PRIM.gamepadBtn,
        color: '#F43F5E',
        position: [0.24, baseY + 0.47, 0.12],
        rotation: [Math.PI / 2 + 0.2, 0, 0],
      }
    );
  }

  return parts;
}

const topperGeometryCache = new Map<ShopBranch, THREE.BufferGeometry>();

function getTopperGeometry(branch: ShopBranch): THREE.BufferGeometry {
  let geom = topperGeometryCache.get(branch);
  if (!geom) {
    geom = mergeColoredGeometries(buildTopperParts(branch, 0));
    topperGeometryCache.set(branch, geom);
  }
  return geom;
}

export interface ShopToppersProps {
  branch: ShopBranch;
  position?: [number, number, number];
}

/**
 * Renders the 3D rooftop emblem for each shop branch as a single cached vertex-colored mesh (Rule 6.2 & 8.9).
 */
export function ShopToppers({
  branch,
  position = [0, 0, 0],
}: ShopToppersProps) {
  return (
    <group name="Anchor_Topper" position={position}>
      <mesh geometry={getTopperGeometry(branch)} material={TOPPER_VERTEX_MAT} />
    </group>
  );
}
