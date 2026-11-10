import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { WeatherMode } from '../../state/types';

const RAINBOW_COLORS = [
  '#EF4444',
  '#F97316',
  '#FACC15',
  '#22C55E',
  '#38BDF8',
  '#6366F1',
  '#A855F7',
] as const;

const RAINBOW_BANDS = RAINBOW_COLORS.map((hex, i) => ({
  color: hex,
  geometry: new THREE.TorusGeometry(46 - i * 1.15, 0.45, 10, 48, Math.PI),
  material: new THREE.MeshBasicMaterial({
    color: hex,
    transparent: true,
    opacity: 0.78,
  }),
}));

const SUN_GEOM = new THREE.SphereGeometry(4.4, 24, 24);
const SUN_HALO_INNER = new THREE.SphereGeometry(6.2, 24, 24);
const SUN_HALO_OUTER = new THREE.SphereGeometry(9.2, 24, 24);
const SUN_MAT = new THREE.MeshBasicMaterial({ color: '#FEF08A', fog: false });
const SUN_HALO_INNER_MAT = new THREE.MeshBasicMaterial({
  color: '#FDE047',
  transparent: true,
  opacity: 0.26,
  depthWrite: false,
  fog: false,
});
const SUN_HALO_OUTER_MAT = new THREE.MeshBasicMaterial({
  color: '#F59E0B',
  transparent: true,
  opacity: 0.11,
  depthWrite: false,
  fog: false,
});

const RAIN_COUNT_HIGH = 750;
const RAIN_COUNT_LOW = 280;

export interface WeatherProps {
  mode: WeatherMode;
  lowPowerMode?: boolean;
}

/**
 * Renders 3D weather effects (`sunny`, `rainbow`, `rainy`) (Rule 6.5 & 8.7).
 * Rain uses a single `<points>` BufferGeometry updated in `useFrame` with zero allocations.
 */
export function Weather({ mode, lowPowerMode = false }: WeatherProps) {
  const rainPointsRef = useRef<THREE.Points>(null);

  const count = lowPowerMode ? RAIN_COUNT_LOW : RAIN_COUNT_HIGH;

  const { rainGeom, rainMat } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 110;
      positions[i * 3 + 1] = Math.random() * 42;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 85;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: '#BAE6FD',
      size: 0.35,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    return { rainGeom: geom, rainMat: mat };
  }, [count]);

  useEffect(() => {
    return () => {
      rainGeom.dispose();
      rainMat.dispose();
    };
  }, [rainGeom, rainMat]);

  useFrame((_, delta) => {
    if (mode !== 'rainy' || !rainPointsRef.current) return;
    const posAttr = rainPointsRef.current.geometry.getAttribute(
      'position'
    ) as THREE.BufferAttribute | undefined;
    if (!posAttr) return;

    const arr = posAttr.array as Float32Array;
    const fallStep = 28 * Math.min(0.05, delta);

    for (let i = 1; i < arr.length; i += 3) {
      let y = arr[i]! - fallStep;
      if (y < 0) {
        y = 40;
      }
      arr[i] = y;
    }
    posAttr.needsUpdate = true;
  });


  return (
    <group name="Weather">
      {/* Luminous Cosmic Sun / Moon with layered glow halos */}
      {mode !== 'rainy' && (
        <group position={[48, 52, -58]}>
          <mesh geometry={SUN_GEOM} material={SUN_MAT} />
          <mesh geometry={SUN_HALO_INNER} material={SUN_HALO_INNER_MAT} />
          <mesh geometry={SUN_HALO_OUTER} material={SUN_HALO_OUTER_MAT} />
        </group>
      )}

      {/* 3D Rainbow Arch in Rainbow mode */}
      {mode === 'rainbow' && (
        <group position={[0, -2, -36]} rotation={[0, 0.12, 0]}>
          {RAINBOW_BANDS.map((band) => (
            <mesh
              key={band.color}
              geometry={band.geometry}
              material={band.material}
            />
          ))}
        </group>
      )}

      {/* Single-draw-call Rain particle system in Rainy mode */}
      {mode === 'rainy' && (
        <points
          ref={rainPointsRef}
          geometry={rainGeom}
          material={rainMat}
        />
      )}

    </group>
  );
}
