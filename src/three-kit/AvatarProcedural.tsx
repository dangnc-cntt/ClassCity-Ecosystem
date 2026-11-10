import * as THREE from 'three';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from './mergeColoredGeometries';

// Base primitive templates used only at module initialization to bake 5 single-draw-call avatar meshes (Rule 6.3 & 8.3)
const AVATAR_PRIM = {
  torso: new THREE.CapsuleGeometry(0.24, 0.32, 6, 12),
  head: new THREE.SphereGeometry(0.24, 14, 14),
  eye: new THREE.SphereGeometry(0.035, 8, 8),
  limb: new THREE.CapsuleGeometry(0.065, 0.2, 4, 8),
  helmetVisor: new THREE.BoxGeometry(0.32, 0.12, 0.26),
  helmetPlume: new THREE.ConeGeometry(0.09, 0.28, 8),
  shield: new THREE.BoxGeometry(0.06, 0.34, 0.28),
  wizardBrim: new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16),
  wizardCone: new THREE.ConeGeometry(0.22, 0.48, 12),
  staffRod: new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8),
  staffOrb: new THREE.SphereGeometry(0.08, 10, 10),
  spaceHelmet: new THREE.SphereGeometry(0.28, 16, 16),
  spaceVisor: new THREE.SphereGeometry(0.22, 14, 14),
  jetpack: new THREE.BoxGeometry(0.28, 0.36, 0.16),
  dinoSnout: new THREE.BoxGeometry(0.22, 0.16, 0.24),
  dinoSpike: new THREE.ConeGeometry(0.06, 0.16, 6),
  dinoTail: new THREE.ConeGeometry(0.1, 0.38, 8),
  catEar: new THREE.ConeGeometry(0.09, 0.18, 4),
  catTail: new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8),
};

const SHARED_AVATAR_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.45,
  metalness: 0.08,
});

type AvatarKind = 'knight' | 'mage' | 'astronaut' | 'dino' | 'cat';

const avatarGeometryCache = new Map<AvatarKind, THREE.BufferGeometry>();

function getMergedAvatarGeometry(kind: AvatarKind): THREE.BufferGeometry {
  const existing = avatarGeometryCache.get(kind);
  if (existing) return existing;

  const bodyColor =
    kind === 'knight'
      ? '#94A3B8'
      : kind === 'mage'
        ? '#7C3AED'
        : kind === 'astronaut'
          ? '#F8FAFC'
          : kind === 'dino'
            ? '#22C55E'
            : '#FB923C';

  const headColor =
    kind === 'dino' ? '#22C55E' : kind === 'cat' ? '#FB923C' : '#FDE68A';

  const parts: ColoredPartSpec[] = [
    { geometry: AVATAR_PRIM.torso, color: bodyColor, position: [0, 0.48, 0] },
    { geometry: AVATAR_PRIM.head, color: headColor, position: [0, 0.96, 0] },
    {
      geometry: AVATAR_PRIM.eye,
      color: '#0F172A',
      position: [-0.08, 0.99, 0.21],
    },
    {
      geometry: AVATAR_PRIM.eye,
      color: '#0F172A',
      position: [0.08, 0.99, 0.21],
    },
    {
      geometry: AVATAR_PRIM.limb,
      color: bodyColor,
      position: [-0.31, 0.5, 0],
      rotation: [0, 0, 0.2],
    },
    {
      geometry: AVATAR_PRIM.limb,
      color: bodyColor,
      position: [0.31, 0.5, 0],
      rotation: [0, 0, -0.2],
    },
  ];

  if (kind === 'knight') {
    parts.push(
      {
        geometry: AVATAR_PRIM.helmetVisor,
        color: '#94A3B8',
        position: [0, 1.06, 0.06],
      },
      {
        geometry: AVATAR_PRIM.helmetPlume,
        color: '#E11D48',
        position: [0, 1.32, -0.04],
        rotation: [-0.25, 0, 0],
      },
      {
        geometry: AVATAR_PRIM.shield,
        color: '#E11D48',
        position: [-0.38, 0.48, 0.1],
      }
    );
  } else if (kind === 'mage') {
    parts.push(
      {
        geometry: AVATAR_PRIM.wizardBrim,
        color: '#7C3AED',
        position: [0, 1.16, 0],
      },
      {
        geometry: AVATAR_PRIM.wizardCone,
        color: '#7C3AED',
        position: [0, 1.4, 0],
      },
      {
        geometry: AVATAR_PRIM.staffRod,
        color: '#FBBF24',
        position: [0.38, 0.55, 0.12],
      },
      {
        geometry: AVATAR_PRIM.staffOrb,
        color: '#38BDF8',
        position: [0.38, 1.02, 0.12],
      }
    );
  } else if (kind === 'astronaut') {
    parts.push(
      {
        geometry: AVATAR_PRIM.spaceHelmet,
        color: '#F8FAFC',
        position: [0, 0.96, 0],
      },
      {
        geometry: AVATAR_PRIM.spaceVisor,
        color: '#06B6D4',
        position: [0, 0.96, 0.09],
      },
      {
        geometry: AVATAR_PRIM.jetpack,
        color: '#F97316',
        position: [0, 0.52, -0.24],
      }
    );
  } else if (kind === 'dino') {
    parts.push(
      {
        geometry: AVATAR_PRIM.dinoSnout,
        color: '#22C55E',
        position: [0, 0.92, 0.22],
      },
      {
        geometry: AVATAR_PRIM.dinoSpike,
        color: '#FACC15',
        position: [0, 1.24, -0.05],
      },
      {
        geometry: AVATAR_PRIM.dinoSpike,
        color: '#FACC15',
        position: [0, 0.78, -0.24],
        rotation: [-Math.PI / 2, 0, 0],
      },
      {
        geometry: AVATAR_PRIM.dinoTail,
        color: '#22C55E',
        position: [0, 0.28, -0.34],
        rotation: [-1.1, 0, 0],
      }
    );
  } else {
    parts.push(
      {
        geometry: AVATAR_PRIM.catEar,
        color: '#F472B6',
        position: [-0.14, 1.22, 0],
        rotation: [0, 0, 0.22],
      },
      {
        geometry: AVATAR_PRIM.catEar,
        color: '#F472B6',
        position: [0.14, 1.22, 0],
        rotation: [0, 0, -0.22],
      },
      {
        geometry: AVATAR_PRIM.catTail,
        color: '#FB923C',
        position: [0, 0.36, -0.28],
        rotation: [-0.8, 0, 0],
      }
    );
  }

  const merged = mergeColoredGeometries(parts);
  avatarGeometryCache.set(kind, merged);
  return merged;
}

export interface AvatarProceduralProps {
  avatarId: string;
}

/**
 * Cute procedural 3D student avatar supporting 5 distinct archetypes (Rule 6.3 & 8.9):
 * `avatar_knight`, `avatar_mage`, `avatar_astronaut`, `avatar_dino`, `avatar_cat`.
 * Pre-merged per archetype into a single vertex-colored `BufferGeometry` (1 draw call, no dynamic shadow).
 */
export function AvatarProcedural({ avatarId }: AvatarProceduralProps) {
  const raw = avatarId.replace(/^avatar_/, '');
  const kind: AvatarKind =
    raw === 'knight' ||
    raw === 'mage' ||
    raw === 'astronaut' ||
    raw === 'dino'
      ? raw
      : 'cat';

  const geometry = getMergedAvatarGeometry(kind);

  return <mesh geometry={geometry} material={SHARED_AVATAR_MAT} />;
}
