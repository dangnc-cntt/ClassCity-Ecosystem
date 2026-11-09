import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { WONDER_RADIUS } from '../../config/cityLayout';
import { calculateWonderProgress } from '../../domain/levels';

const WONDER_GEOM = {
  plazaBase: new THREE.CylinderGeometry(WONDER_RADIUS - 0.6, WONDER_RADIUS, 0.45, 32),
  tier1Pedestal: new THREE.CylinderGeometry(4.2, 4.8, 1.1, 16),
  tier2Colonade: new THREE.CylinderGeometry(3.1, 3.5, 2.2, 12),
  tier3Tower: new THREE.CylinderGeometry(2.1, 2.6, 2.8, 10),
  tier4Dome: new THREE.SphereGeometry(2.05, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  tier5Spire: new THREE.ConeGeometry(0.85, 2.8, 8),
  tier6Crystal: new THREE.OctahedronGeometry(0.85, 0),
  orbitRing: new THREE.TorusGeometry(2.8, 0.08, 10, 32),
};

const WONDER_MAT = {
  plazaGrass: new THREE.MeshStandardMaterial({ color: '#10B981', roughness: 0.7 }),
  marble: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.4 }),
  tealStone: new THREE.MeshStandardMaterial({
    color: '#0D9488',
    roughness: 0.35,
    metalness: 0.15,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: '#FBBF24',
    emissive: '#D97706',
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.6,
  }),
  crystal: new THREE.MeshStandardMaterial({
    color: '#38BDF8',
    emissive: '#0284C7',
    emissiveIntensity: 0.75,
    roughness: 0.15,
    metalness: 0.4,
  }),
};

export interface ClassWonderProps {
  wonderProgress: number;
  studentCount: number;
  pointsPerLevel: number;
}

/**
 * Central Class Wonder monument at [0, 0, 0] inside the roundabout (Rule 6.5).
 * Grows progressively through 6 stages as total class points increase.
 */
export function ClassWonder({
  wonderProgress,
  studentCount,
  pointsPerLevel,
}: ClassWonderProps) {
  const { stage } = calculateWonderProgress(
    wonderProgress,
    studentCount,
    pointsPerLevel
  );

  const rootRef = useRef<THREE.Group>(null);
  const crystalRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const prevStageRef = useRef<number>(stage);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (crystalRef.current) {
      crystalRef.current.rotation.y = t * 1.4;
      crystalRef.current.position.y = 8.8 + Math.sin(t * 2.2) * 0.22;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.8;
    }
  });

  useEffect(() => {
    if (prevStageRef.current === stage) return;
    prevStageRef.current = stage;
    const grp = rootRef.current;
    if (!grp) return;

    tweenRef.current?.kill();
    tweenRef.current = gsap.fromTo(
      grp.scale,
      { x: 0.82, y: 1.25, z: 0.82 },
      { x: 1, y: 1, z: 1, duration: 0.65, ease: 'elastic.out(1, 0.5)' }
    );
  }, [stage]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  return (
    <group ref={rootRef} position={[0, 0, 0]} name="ClassWonder">
      {/* Roundabout island base */}
      <mesh
        geometry={WONDER_GEOM.plazaBase}
        material={WONDER_MAT.plazaGrass}
        position={[0, 0.22, 0]}
        receiveShadow
      />

      {/* Stage 1+: Marble Pedestal */}
      <mesh
        geometry={WONDER_GEOM.tier1Pedestal}
        material={WONDER_MAT.marble}
        position={[0, 0.95, 0]}
        castShadow
        receiveShadow
      />

      {/* Stage 2+: Colonnade Hall */}
      {stage >= 2 && (
        <mesh
          geometry={WONDER_GEOM.tier2Colonade}
          material={WONDER_MAT.tealStone}
          position={[0, 2.6, 0]}
          castShadow
          receiveShadow
        />
      )}

      {/* Stage 3+: Upper Knowledge Tower */}
      {stage >= 3 && (
        <mesh
          geometry={WONDER_GEOM.tier3Tower}
          material={WONDER_MAT.marble}
          position={[0, 5.1, 0]}
          castShadow
          receiveShadow
        />
      )}

      {/* Stage 4+: Golden Dome */}
      {stage >= 4 && (
        <mesh
          geometry={WONDER_GEOM.tier4Dome}
          material={WONDER_MAT.gold}
          position={[0, 6.5, 0]}
          castShadow
        />
      )}

      {/* Stage 5+: Spire & Orbiting Ring */}
      {stage >= 5 && (
        <>
          <mesh
            geometry={WONDER_GEOM.tier5Spire}
            material={WONDER_MAT.gold}
            position={[0, 7.6, 0]}
          />
          <mesh
            ref={ringRef}
            geometry={WONDER_GEOM.orbitRing}
            material={WONDER_MAT.gold}
            position={[0, 5.2, 0]}
            rotation={[Math.PI / 3, 0, 0]}
          />
        </>
      )}

      {/* Stage 6: Levitating Wisdom Crystal */}
      {stage >= 6 && (
        <mesh
          ref={crystalRef}
          geometry={WONDER_GEOM.tier6Crystal}
          material={WONDER_MAT.crystal}
          position={[0, 8.8, 0]}
        />
      )}
    </group>
  );
}
