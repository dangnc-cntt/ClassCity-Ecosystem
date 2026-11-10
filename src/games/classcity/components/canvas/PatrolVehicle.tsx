import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { SoundEffectsService } from '../../../../platform/audio/soundEffects';
import { BlobShadow } from '../../../../three-kit/BlobShadow';
import { mergeColoredGeometries } from '../../../../three-kit/mergeColoredGeometries';
import { checkGiftBoxCollision } from '../../domain/perks';
import { findNearestLot } from '../../domain/selectors';
import type { VehicleKind } from '../../state/types';
import { useClassStore } from '../../state/useClassStore';

// Shared procedural vehicle geometries & materials (Rule 6.4 & 8.3)
const VEH_GEOM = {
  carChassis: new THREE.BoxGeometry(2.6, 0.65, 1.45),
  carCabin: new THREE.BoxGeometry(1.45, 0.58, 1.28),
  wheel: new THREE.CylinderGeometry(0.32, 0.32, 0.24, 14),
  headlight: new THREE.SphereGeometry(0.12, 8, 8),
  beacon: new THREE.CylinderGeometry(0.14, 0.18, 0.22, 10),
  ambBody: new THREE.BoxGeometry(2.85, 1.15, 1.55),
  ambCrossH: new THREE.BoxGeometry(0.55, 0.16, 0.04),
  ambCrossV: new THREE.BoxGeometry(0.16, 0.55, 0.04),
  ufoSaucer: new THREE.CylinderGeometry(1.15, 1.65, 0.38, 24),
  ufoDome: new THREE.SphereGeometry(0.82, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  ufoBeam: new THREE.ConeGeometry(1.35, 2.1, 20, 1, true),
};

const VEH_MAT = {
  carYellow: new THREE.MeshStandardMaterial({
    color: '#FACC15',
    roughness: 0.3,
    metalness: 0.2,
  }),
  carGlass: new THREE.MeshStandardMaterial({
    color: '#BAE6FD',
    roughness: 0.15,
    metalness: 0.4,
  }),
  tireDark: new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.8 }),
  headlightGlow: new THREE.MeshStandardMaterial({
    color: '#FEF08A',
    emissive: '#F59E0B',
    emissiveIntensity: 0.9,
  }),
  ambWhite: new THREE.MeshStandardMaterial({ color: '#F8FAFC', roughness: 0.35 }),
  ambRed: new THREE.MeshStandardMaterial({
    color: '#EF4444',
    emissive: '#B91C1C',
    emissiveIntensity: 0.45,
  }),
  ambBlue: new THREE.MeshStandardMaterial({
    color: '#3B82F6',
    emissive: '#1D4ED8',
    emissiveIntensity: 0.65,
  }),
  ufoHull: new THREE.MeshStandardMaterial({
    color: '#A855F7',
    metalness: 0.65,
    roughness: 0.25,
  }),
  ufoDome: new THREE.MeshStandardMaterial({
    color: '#22D3EE',
    emissive: '#0891B2',
    emissiveIntensity: 0.5,
    roughness: 0.15,
  }),
  ufoBeam: new THREE.MeshBasicMaterial({
    color: '#38BDF8',
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
};

const MERGED_CAR_GEOM = mergeColoredGeometries([
  { geometry: VEH_GEOM.carChassis, color: '#FACC15', position: [0, 0.32, 0] },
  { geometry: VEH_GEOM.carCabin, color: '#BAE6FD', position: [-0.1, 0.85, 0] },
  { geometry: VEH_GEOM.beacon, color: '#EF4444', position: [-0.1, 1.22, 0] },
  {
    geometry: VEH_GEOM.headlight,
    color: '#FEF08A',
    position: [1.31, 0.38, 0.46],
  },
  {
    geometry: VEH_GEOM.headlight,
    color: '#FEF08A',
    position: [1.31, 0.38, -0.46],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [-0.78, 0, 0.74],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [0.78, 0, 0.74],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [-0.78, 0, -0.74],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [0.78, 0, -0.74],
    rotation: [Math.PI / 2, 0, 0],
  },
]);

const MERGED_AMB_GEOM = mergeColoredGeometries([
  { geometry: VEH_GEOM.ambBody, color: '#F8FAFC', position: [0, 0.58, 0] },
  { geometry: VEH_GEOM.carCabin, color: '#BAE6FD', position: [0.72, 0.72, 0] },
  {
    geometry: VEH_GEOM.ambCrossH,
    color: '#EF4444',
    position: [-0.25, 0.68, 0.79],
  },
  {
    geometry: VEH_GEOM.ambCrossV,
    color: '#EF4444',
    position: [-0.25, 0.68, 0.79],
  },
  {
    geometry: VEH_GEOM.ambCrossH,
    color: '#EF4444',
    position: [-0.25, 0.68, -0.79],
  },
  {
    geometry: VEH_GEOM.ambCrossV,
    color: '#EF4444',
    position: [-0.25, 0.68, -0.79],
  },
  { geometry: VEH_GEOM.beacon, color: '#EF4444', position: [0.5, 1.25, 0.35] },
  { geometry: VEH_GEOM.beacon, color: '#3B82F6', position: [0.5, 1.25, -0.35] },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [-0.85, 0, 0.78],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [0.85, 0, 0.78],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [-0.85, 0, -0.78],
    rotation: [Math.PI / 2, 0, 0],
  },
  {
    geometry: VEH_GEOM.wheel,
    color: '#1E293B',
    position: [0.85, 0, -0.78],
    rotation: [Math.PI / 2, 0, 0],
  },
]);

const VEH_VERTEX_MAT = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.35,
  metalness: 0.18,
});

function VehicleProceduralMesh({ kind }: { kind: VehicleKind }) {
  if (kind === 'ambulance') {
    return (
      <group position={[0, 0.32, 0]}>
        <mesh geometry={MERGED_AMB_GEOM} material={VEH_VERTEX_MAT} />
      </group>
    );
  }

  if (kind === 'ufo') {
    return (
      <group position={[0, 2.1, 0]}>
        <mesh geometry={VEH_GEOM.ufoSaucer} material={VEH_MAT.ufoHull} />
        <mesh
          geometry={VEH_GEOM.ufoDome}
          material={VEH_MAT.ufoDome}
          position={[0, 0.14, 0]}
        />
        <mesh
          geometry={VEH_GEOM.ufoBeam}
          material={VEH_MAT.ufoBeam}
          position={[0, -1.05, 0]}
        />
      </group>
    );
  }

  // Default: Cute yellow patrol car (single merged mesh = 1 draw call)
  return (
    <group position={[0, 0.32, 0]}>
      <mesh geometry={MERGED_CAR_GEOM} material={VEH_VERTEX_MAT} />
    </group>
  );
}

function isTypingOrModalActive(activeModal: string): boolean {
  if (activeModal !== 'none') return true;
  if (typeof document === 'undefined') return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest('dialog[open]')) return true;
  return false;
}

export interface PatrolVehicleProps {
  sound?: SoundEffectsService;
  onAutoDriveArrived?: (lotId: number) => void;
  onCollectGiftBox?: (boxId: string, studentId: string) => void;
}

/**
 * Patrol vehicle supporting both Manual (`WASD`/Arrows) and Auto-Pilot driving (Rule 6.4 & R4).
 * Uses `useRef` + `useFrame` so 60 FPS movement never goes through React state.
 */
export function PatrolVehicle({
  sound,
  onAutoDriveArrived,
  onCollectGiftBox,
}: PatrolVehicleProps) {
  const rootRef = useRef<THREE.Group>(null);
  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });

  // Mutable physics/pose state inside useFrame (Rule R4)
  const poseRef = useRef({
    x: -28,
    z: -22,
    heading: 0,
    speed: 0,
  });

  const autoStartClockRef = useRef<number | null>(null);
  const autoArrivedFiredRef = useRef<boolean>(false);
  const lastTickSoundRef = useRef<number>(0);
  const lastNearestCheckRef = useRef<number>(0);

  const {
    vehicleKind,
    vehicleState,
    activeAutoPlan,
    activeModal,
    lots,
    students,
    setNearestManualLotId,
  } = useClassStore(
    useShallow((s) => ({
      vehicleKind: s.vehicleKind,
      vehicleState: s.vehicleState,
      activeAutoPlan: s.activeAutoPlan,
      activeModal: s.activeModal,
      lots: s.layout.lots,
      students: s.students,
      setNearestManualLotId: s.setNearestManualLotId,
    }))
  );

  // Reset auto-drive clock whenever a new plan starts
  useEffect(() => {
    if (activeAutoPlan) {
      autoStartClockRef.current = null;
      autoArrivedFiredRef.current = false;
    }
  }, [activeAutoPlan]);

  // Keyboard listener for Manual WASD / Arrow driving (cleaned up on unmount per Rule R5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingOrModalActive(useClassStore.getState().activeModal)) {
        return;
      }
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') keysRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown')
        keysRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') keysRef.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp')
        keysRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown')
        keysRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') keysRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight')
        keysRef.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const grp = rootRef.current;
    if (!grp) return;

    const dt = Math.min(0.05, delta);
    const nowSec = clock.elapsedTime;

    // 1. AUTO-PILOT MODE
    if (
      activeAutoPlan &&
      (vehicleState === 'accelerating' ||
        vehicleState === 'cruising' ||
        vehicleState === 'decelerating' ||
        vehicleState === 'parked')
    ) {
      if (autoStartClockRef.current === null) {
        autoStartClockRef.current = nowSec;
      }
      const elapsedMs = (nowSec - autoStartClockRef.current) * 1000;
      const sample = activeAutoPlan.sampleAt(elapsedMs);

      poseRef.current.x = sample.x;
      poseRef.current.z = sample.z;
      poseRef.current.heading = sample.heading;
      poseRef.current.speed = 0;

      grp.position.set(sample.x, 0, sample.z);
      grp.rotation.y = -sample.heading;

      // Engine tick sound while cruising
      if (sample.phase !== 'parked' && nowSec - lastTickSoundRef.current > 0.16) {
        lastTickSoundRef.current = nowSec;
        sound?.playEngineTick();
      }

      // Check 2D gift box collision during active callout drive
      const currentBoxes = useClassStore.getState().giftBoxes;
      const hitBox = checkGiftBoxCollision(sample.x, sample.z, currentBoxes);
      if (hitBox) {
        const targetStudent = students.find(
          (s) => s.lotNumber === activeAutoPlan.targetLotId
        );
        if (targetStudent) {
          sound?.playGiftOpen();
          onCollectGiftBox?.(hitBox.id, targetStudent.id);
        }
      }

      // Arrived at target lot parkingPoint
      if (sample.phase === 'parked' && !autoArrivedFiredRef.current) {
        autoArrivedFiredRef.current = true;
        sound?.playHorn();
        onAutoDriveArrived?.(activeAutoPlan.targetLotId);
      }
      return;
    }

    // 2. MANUAL MODE (`WASD` / Arrow keys)
    if (isTypingOrModalActive(activeModal)) {
      keysRef.current.forward = false;
      keysRef.current.backward = false;
      keysRef.current.left = false;
      keysRef.current.right = false;
    }

    const keys = keysRef.current;
    const pose = poseRef.current;
    const maxSpeed = 18;
    const accel = 26;
    const friction = 8.5;
    const turnRate = 2.4;

    if (keys.forward) {
      pose.speed = Math.min(maxSpeed, pose.speed + accel * dt);
    } else if (keys.backward) {
      pose.speed = Math.max(-maxSpeed * 0.55, pose.speed - accel * dt);
    } else {
      // Natural friction damping
      if (Math.abs(pose.speed) < 0.15) {
        pose.speed = 0;
      } else {
        pose.speed -= Math.sign(pose.speed) * friction * dt;
      }
    }

    if (Math.abs(pose.speed) > 0.2) {
      const steerDir = pose.speed >= 0 ? 1 : -1;
      if (keys.left) {
        pose.heading -= turnRate * steerDir * dt;
      }
      if (keys.right) {
        pose.heading += turnRate * steerDir * dt;
      }
    }

    pose.x += Math.cos(pose.heading) * pose.speed * dt;
    pose.z += Math.sin(pose.heading) * pose.speed * dt;

    // Keep within the island's road & park bounds [-58, 58] x [-44, 46]
    pose.x = Math.max(-58, Math.min(58, pose.x));
    pose.z = Math.max(-44, Math.min(46, pose.z));

    grp.position.set(pose.x, 0, pose.z);
    grp.rotation.y = -pose.heading;

    if (Math.abs(pose.speed) > 2.0 && nowSec - lastTickSoundRef.current > 0.18) {
      lastTickSoundRef.current = nowSec;
      sound?.playEngineTick();
    }

    // Allow gift box pickup in Manual mode if a student is currently selected or called
    if (Math.abs(pose.speed) > 0.2) {
      const state = useClassStore.getState();
      const recipientId = state.calledStudentId ?? state.selectedStudentId;
      if (recipientId) {
        const hitBox = checkGiftBoxCollision(pose.x, pose.z, state.giftBoxes);
        if (hitBox) {
          sound?.playGiftOpen();
          onCollectGiftBox?.(hitBox.id, recipientId);
        }
      }
    }

    // Throttled check (~250ms) for nearest lot when stopped/slow in manual mode
    if (nowSec - lastNearestCheckRef.current > 0.25) {
      lastNearestCheckRef.current = nowSec;
      if (Math.abs(pose.speed) < 1.2 && vehicleState === 'idle') {
        const nearest = findNearestLot(lots, pose.x, pose.z, 6.0);
        const currentNearest = useClassStore.getState().nearestManualLotId;
        const nextId = nearest?.id ?? null;
        if (currentNearest !== nextId) {
          setNearestManualLotId(nextId);
        }
      }
    }
  });

  return (
    <group ref={rootRef} position={[-44, 0, 13]} name="PatrolVehicle">
      <BlobShadow radius={1.35} y={0.03} />
      <VehicleProceduralMesh kind={vehicleKind} />
    </group>
  );
}
