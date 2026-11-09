import * as THREE from 'three';

// Shared module-level geometries for all 5 procedural avatars (Rule 6.3 & 8.3)
const AVATAR_GEOM = {
  torso: new THREE.CapsuleGeometry(0.24, 0.32, 6, 12),
  head: new THREE.SphereGeometry(0.24, 14, 14),
  eye: new THREE.SphereGeometry(0.035, 8, 8),
  limb: new THREE.CapsuleGeometry(0.065, 0.2, 4, 8),
  // Knight
  helmetVisor: new THREE.BoxGeometry(0.32, 0.12, 0.26),
  helmetPlume: new THREE.ConeGeometry(0.09, 0.28, 8),
  shield: new THREE.BoxGeometry(0.06, 0.34, 0.28),
  // Mage
  wizardBrim: new THREE.CylinderGeometry(0.38, 0.38, 0.04, 16),
  wizardCone: new THREE.ConeGeometry(0.22, 0.48, 12),
  staffRod: new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8),
  staffOrb: new THREE.SphereGeometry(0.08, 10, 10),
  // Astronaut
  spaceHelmet: new THREE.SphereGeometry(0.28, 16, 16),
  spaceVisor: new THREE.SphereGeometry(0.22, 14, 14),
  jetpack: new THREE.BoxGeometry(0.28, 0.36, 0.16),
  // Dino
  dinoSnout: new THREE.BoxGeometry(0.22, 0.16, 0.24),
  dinoSpike: new THREE.ConeGeometry(0.06, 0.16, 6),
  dinoTail: new THREE.ConeGeometry(0.1, 0.38, 8),
  // Cat
  catEar: new THREE.ConeGeometry(0.09, 0.18, 4),
  catTail: new THREE.CylinderGeometry(0.035, 0.045, 0.42, 8),
};

const AVATAR_MAT = {
  skin: new THREE.MeshStandardMaterial({ color: '#FDE68A', roughness: 0.5 }),
  eyeDark: new THREE.MeshBasicMaterial({ color: '#0F172A' }),
  // Knight
  knightSteel: new THREE.MeshStandardMaterial({
    color: '#94A3B8',
    metalness: 0.6,
    roughness: 0.3,
  }),
  knightRed: new THREE.MeshStandardMaterial({ color: '#E11D48', roughness: 0.4 }),
  // Mage
  mageRobe: new THREE.MeshStandardMaterial({ color: '#7C3AED', roughness: 0.5 }),
  mageGold: new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    emissive: '#D97706',
    emissiveIntensity: 0.4,
  }),
  mageOrb: new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.8,
  }),
  // Astronaut
  astroSuit: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.35 }),
  astroVisor: new THREE.MeshStandardMaterial({
    color: '#06B6D4',
    metalness: 0.7,
    roughness: 0.15,
  }),
  astroTrim: new THREE.MeshStandardMaterial({ color: '#F97316', roughness: 0.4 }),
  // Dino
  dinoGreen: new THREE.MeshStandardMaterial({ color: '#22C55E', roughness: 0.5 }),
  dinoSpike: new THREE.MeshStandardMaterial({ color: '#FACC15', roughness: 0.4 }),
  // Cat
  catOrange: new THREE.MeshStandardMaterial({ color: '#FB923C', roughness: 0.45 }),
  catPink: new THREE.MeshStandardMaterial({ color: '#F472B6', roughness: 0.4 }),
};

export interface AvatarProceduralProps {
  avatarId: string;
}

/**
 * Cute procedural 3D student avatar supporting 5 distinct archetypes (Rule 6.3):
 * `avatar_knight`, `avatar_mage`, `avatar_astronaut`, `avatar_dino`, `avatar_cat`.
 * Never casts dynamic shadows (`castShadow` is intentionally omitted per Rule 6.3 & 8.1).
 */
export function AvatarProcedural({ avatarId }: AvatarProceduralProps) {
  const kind = avatarId.replace(/^avatar_/, '');

  const bodyMat =
    kind === 'knight'
      ? AVATAR_MAT.knightSteel
      : kind === 'mage'
        ? AVATAR_MAT.mageRobe
        : kind === 'astronaut'
          ? AVATAR_MAT.astroSuit
          : kind === 'dino'
            ? AVATAR_MAT.dinoGreen
            : AVATAR_MAT.catOrange;

  const headMat =
    kind === 'dino'
      ? AVATAR_MAT.dinoGreen
      : kind === 'cat'
        ? AVATAR_MAT.catOrange
        : AVATAR_MAT.skin;

  return (
    <group>
      {/* Torso */}
      <mesh
        geometry={AVATAR_GEOM.torso}
        material={bodyMat}
        position={[0, 0.48, 0]}
      />

      {/* Head */}
      <mesh
        geometry={AVATAR_GEOM.head}
        material={headMat}
        position={[0, 0.96, 0]}
      />

      {/* Eyes (facing +Z) */}
      <mesh
        geometry={AVATAR_GEOM.eye}
        material={AVATAR_MAT.eyeDark}
        position={[-0.08, 0.99, 0.21]}
      />
      <mesh
        geometry={AVATAR_GEOM.eye}
        material={AVATAR_MAT.eyeDark}
        position={[0.08, 0.99, 0.21]}
      />

      {/* Arms */}
      <mesh
        geometry={AVATAR_GEOM.limb}
        material={bodyMat}
        position={[-0.31, 0.5, 0]}
        rotation={[0, 0, 0.2]}
      />
      <mesh
        geometry={AVATAR_GEOM.limb}
        material={bodyMat}
        position={[0.31, 0.5, 0]}
        rotation={[0, 0, -0.2]}
      />

      {/*1. Knight accessories: Visor + Red Plume + Shield */}
      {kind === 'knight' && (
        <group>
          <mesh
            geometry={AVATAR_GEOM.helmetVisor}
            material={AVATAR_MAT.knightSteel}
            position={[0, 1.06, 0.06]}
          />
          <mesh
            geometry={AVATAR_GEOM.helmetPlume}
            material={AVATAR_MAT.knightRed}
            position={[0, 1.32, -0.04]}
            rotation={[-0.25, 0, 0]}
          />
          <mesh
            geometry={AVATAR_GEOM.shield}
            material={AVATAR_MAT.knightRed}
            position={[-0.38, 0.48, 0.1]}
          />
        </group>
      )}

      {/* 2. Mage accessories: Pointed Wizard Hat + Glowing Staff */}
      {kind === 'mage' && (
        <group>
          <mesh
            geometry={AVATAR_GEOM.wizardBrim}
            material={AVATAR_MAT.mageRobe}
            position={[0, 1.16, 0]}
          />
          <mesh
            geometry={AVATAR_GEOM.wizardCone}
            material={AVATAR_MAT.mageRobe}
            position={[0, 1.4, 0]}
          />
          <mesh
            geometry={AVATAR_GEOM.staffRod}
            material={AVATAR_MAT.mageGold}
            position={[0.38, 0.55, 0.12]}
          />
          <mesh
            geometry={AVATAR_GEOM.staffOrb}
            material={AVATAR_MAT.mageOrb}
            position={[0.38, 1.02, 0.12]}
          />
        </group>
      )}

      {/* 3. Astronaut accessories: Glass Dome + Cyan Visor + Jetpack */}
      {kind === 'astronaut' && (
        <group>
          <mesh
            geometry={AVATAR_GEOM.spaceHelmet}
            material={AVATAR_MAT.astroSuit}
            position={[0, 0.96, 0]}
          />
          <mesh
            geometry={AVATAR_GEOM.spaceVisor}
            material={AVATAR_MAT.astroVisor}
            position={[0, 0.96, 0.09]}
          />
          <mesh
            geometry={AVATAR_GEOM.jetpack}
            material={AVATAR_MAT.astroTrim}
            position={[0, 0.52, -0.24]}
          />
        </group>
      )}

      {/* 4. Dino accessories: Snout + Back Spikes + Tail */}
      {kind === 'dino' && (
        <group>
          <mesh
            geometry={AVATAR_GEOM.dinoSnout}
            material={AVATAR_MAT.dinoGreen}
            position={[0, 0.92, 0.22]}
          />
          <mesh
            geometry={AVATAR_GEOM.dinoSpike}
            material={AVATAR_MAT.dinoSpike}
            position={[0, 1.24, -0.05]}
          />
          <mesh
            geometry={AVATAR_GEOM.dinoSpike}
            material={AVATAR_MAT.dinoSpike}
            position={[0, 0.78, -0.24]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
          <mesh
            geometry={AVATAR_GEOM.dinoTail}
            material={AVATAR_MAT.dinoGreen}
            position={[0, 0.28, -0.34]}
            rotation={[-1.1, 0, 0]}
          />
        </group>
      )}

      {/* 5. Cat accessories: Pointed Ears + Tail */}
      {(kind === 'cat' ||
        (kind !== 'knight' &&
          kind !== 'mage' &&
          kind !== 'astronaut' &&
          kind !== 'dino')) && (
        <group>
          <mesh
            geometry={AVATAR_GEOM.catEar}
            material={AVATAR_MAT.catPink}
            position={[-0.14, 1.22, 0]}
            rotation={[0, 0, 0.22]}
          />
          <mesh
            geometry={AVATAR_GEOM.catEar}
            material={AVATAR_MAT.catPink}
            position={[0.14, 1.22, 0]}
            rotation={[0, 0, -0.22]}
          />
          <mesh
            geometry={AVATAR_GEOM.catTail}
            material={AVATAR_MAT.catOrange}
            position={[0, 0.36, -0.28]}
            rotation={[-0.8, 0, 0]}
          />
        </group>
      )}
    </group>
  );
}
