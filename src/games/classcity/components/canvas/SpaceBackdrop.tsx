import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAvatarGeometry } from '../../../../three-kit/AvatarProcedural';
import {
  mergeColoredGeometries,
  type ColoredPartSpec,
} from '../../../../three-kit/mergeColoredGeometries';

// Deterministic PRNG so the sky is identical on every run (no Math.random during render)
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STAR_COUNT = 1800;
const STAR_TINTS = ['#FFFFFF', '#E0F2FE', '#FEF3C7', '#DDD6FE', '#FBCFE8'];

function buildStarGeometry(): THREE.BufferGeometry {
  const rng = mulberry32(31415);
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const c = new THREE.Color();
  for (let i = 0; i < STAR_COUNT; i += 1) {
    // Uniform direction on a sphere, radius between 420 and 560
    const u = rng() * 2 - 1;
    const phi = rng() * Math.PI * 2;
    const r = 420 + rng() * 140;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(phi) * s * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = Math.sin(phi) * s * r;
    c.set(STAR_TINTS[Math.floor(rng() * STAR_TINTS.length)]!);
    const dim = 0.45 + rng() * 0.55;
    colors[i * 3] = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geom.computeBoundingSphere();
  return geom;
}

const PLANET_PRIM = {
  sphere: new THREE.SphereGeometry(1, 28, 20),
  ring: new THREE.TorusGeometry(1, 0.06, 6, 64),
};

function buildPlanetGeometry(): THREE.BufferGeometry {
  const parts: ColoredPartSpec[] = [
    // Big ringed gas giant
    { geometry: PLANET_PRIM.sphere, color: '#F59E0B', position: [-230, 80, -280], scale: [40, 40, 40] },
    { geometry: PLANET_PRIM.sphere, color: '#FCD34D', position: [-230, 94, -280], scale: [34, 4, 34] },
    {
      geometry: PLANET_PRIM.ring,
      color: '#FDE68A',
      position: [-230, 80, -280],
      rotation: [Math.PI / 2 - 0.35, 0, 0.25],
      scale: [66, 66, 1.2],
    },
    {
      geometry: PLANET_PRIM.ring,
      color: '#FBBF24',
      position: [-230, 80, -280],
      rotation: [Math.PI / 2 - 0.35, 0, 0.25],
      scale: [76, 76, 1.2],
    },
    // Blue ocean world
    { geometry: PLANET_PRIM.sphere, color: '#38BDF8', position: [250, -10, -320], scale: [28, 28, 28] },
    { geometry: PLANET_PRIM.sphere, color: '#4ADE80', position: [262, 6, -296], scale: [12, 8, 10] },
    // Small red moon high above, pale moon low in front
    { geometry: PLANET_PRIM.sphere, color: '#FB7185', position: [70, 170, -400], scale: [15, 15, 15] },
    { geometry: PLANET_PRIM.sphere, color: '#CBD5E1', position: [-150, -110, 230], scale: [11, 11, 11] },
    { geometry: PLANET_PRIM.sphere, color: '#94A3B8', position: [-146, -104, 240], scale: [3, 3, 3] },
  ];
  return mergeColoredGeometries(parts);
}

const NEBULA_PRIM = new THREE.CircleGeometry(1, 28);

function buildNebulaGeometry(): THREE.BufferGeometry {
  const defs: Array<{ p: [number, number, number]; s: number; color: string }> = [
    { p: [-120, 60, -430], s: 190, color: '#7C3AED' },
    { p: [160, 40, -420], s: 170, color: '#EC4899' },
    { p: [330, 130, -120], s: 150, color: '#2563EB' },
    { p: [-340, 20, 80], s: 160, color: '#06B6D4' },
    { p: [20, -140, -380], s: 210, color: '#A855F7' },
    { p: [-60, 190, 300], s: 150, color: '#F472B6' },
  ];
  const parts: ColoredPartSpec[] = defs.map(({ p, s, color }) => ({
    geometry: NEBULA_PRIM,
    color,
    position: p,
    // CircleGeometry faces +Z; yaw it toward the scene origin
    rotation: [0, Math.atan2(-p[0], -p[2]), 0],
    scale: [s, s * 0.7, 1],
  }));
  return mergeColoredGeometries(parts);
}

const ORBIT_AVATARS_A = [
  'avatar_astronaut',
  'avatar_cat',
  'avatar_knight',
] as const;
const ORBIT_AVATARS_B = ['avatar_dino', 'avatar_mage', 'avatar_astronaut'] as const;

/** Bakes avatars standing on glowing hover discs, evenly spaced on a ring, into one mesh. */
function buildAvatarCarouselGeometry(
  ids: readonly string[],
  radius: number
): THREE.BufferGeometry {
  const disc = new THREE.CylinderGeometry(0.55, 0.4, 0.12, 14);
  const parts: ColoredPartSpec[] = [];
  ids.forEach((id, i) => {
    const angle = (i / ids.length) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const yaw = -angle; // face along the orbit tangent
    const bob = Math.sin(i * 2.1) * 2.5;
    parts.push(
      {
        geometry: getAvatarGeometry(id),
        position: [x, bob, z],
        rotation: [0, yaw, 0],
        scale: [3.6, 3.6, 3.6],
      },
      {
        geometry: disc,
        color: '#38BDF8',
        position: [x, bob - 0.2, z],
        scale: [3.6, 3.6, 3.6],
      }
    );
  });
  const merged = mergeColoredGeometries(parts);
  disc.dispose();
  return merged;
}

function createNebulaTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const STARS_GEOM = buildStarGeometry();
const PLANETS_GEOM = buildPlanetGeometry();
const NEBULA_GEOM = buildNebulaGeometry();
const CAROUSEL_A_GEOM = buildAvatarCarouselGeometry(ORBIT_AVATARS_A, 96);
const CAROUSEL_B_GEOM = buildAvatarCarouselGeometry(ORBIT_AVATARS_B, 118);

const STARS_MAT = new THREE.PointsMaterial({
  size: 2.1,
  sizeAttenuation: false,
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
  fog: false,
});
const PLANET_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.9,
  metalness: 0.05,
  flatShading: true,
  fog: false,
});
const AVATAR_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.5,
  metalness: 0.1,
  emissive: '#1E3A8A',
  emissiveIntensity: 0.25,
});

export interface SpaceBackdropProps {
  reducedMotion?: boolean;
}

/**
 * Deep-space surroundings for the floating island: 1,800 stars, additive nebula glows, a ringed gas giant
 * with moons, and two carousels of avatars hovering around the island on glowing discs.
 * Everything is baked into 5 draw calls (Rule 8.9) and animated through refs in `useFrame` (R4).
 */
export function SpaceBackdrop({ reducedMotion = false }: SpaceBackdropProps) {
  const skyRef = useRef<THREE.Group>(null);
  const carouselARef = useRef<THREE.Mesh>(null);
  const carouselBRef = useRef<THREE.Mesh>(null);

  const nebulaMat = useMemo(() => {
    const map = createNebulaTexture();
    return new THREE.MeshBasicMaterial({
      map: map ?? undefined,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
  }, []);

  useEffect(() => {
    return () => {
      nebulaMat.map?.dispose();
      nebulaMat.dispose();
    };
  }, [nebulaMat]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (skyRef.current) {
      skyRef.current.rotation.y = t * 0.006;
    }
    if (carouselARef.current) {
      carouselARef.current.rotation.y = t * 0.05;
      carouselARef.current.position.y = 16 + Math.sin(t * 0.7) * 2.2;
    }
    if (carouselBRef.current) {
      carouselBRef.current.rotation.y = -t * 0.035;
      carouselBRef.current.position.y = -4 + Math.sin(t * 0.55 + 1.3) * 2.6;
    }
  });

  return (
    <group name="SpaceBackdrop">
      <group ref={skyRef}>
        <points geometry={STARS_GEOM} material={STARS_MAT} frustumCulled={false} />
        <mesh geometry={NEBULA_GEOM} material={nebulaMat} frustumCulled={false} renderOrder={-1} />
        <mesh geometry={PLANETS_GEOM} material={PLANET_MAT} frustumCulled={false} />
      </group>
      <mesh ref={carouselARef} geometry={CAROUSEL_A_GEOM} material={AVATAR_MAT} position={[0, 16, 0]} frustumCulled={false} />
      <mesh ref={carouselBRef} geometry={CAROUSEL_B_GEOM} material={AVATAR_MAT} position={[0, -4, 0]} frustumCulled={false} />
    </group>
  );
}
