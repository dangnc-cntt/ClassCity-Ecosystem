import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { AssetService } from '../../../../platform/assets/assetService';
import { AvatarProcedural } from '../../../../three-kit/AvatarProcedural';
import { BlobShadow } from '../../../../three-kit/BlobShadow';
import { disposeObject3D } from '../../../../three-kit/Disposer';

function hashStudentPhase(studentId: string): number {
  let h = 2166136261;
  for (let i = 0; i < studentId.length; i += 1) {
    h ^= studentId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 628) / 100; // [0, 6.28)
}

export interface Avatar3DProps {
  studentId: string;
  avatarId: string;
  patrolA: [number, number];
  patrolB: [number, number];
  lotPosition: [number, number, number];
  lotRotationY: number;
  jumpTriggerTimestamp?: number;
  isCalled?: boolean;
  assets?: AssetService;
}

/**
 * Animated 3D student avatar walking along the sidewalk in front of their shop (Rule 6.3 & R4).
 * Uses `useRef` + `useFrame` with zero React state updates per frame.
 */
export function Avatar3D({
  studentId,
  avatarId,
  patrolA,
  patrolB,
  lotPosition,
  lotRotationY,
  jumpTriggerTimestamp = 0,
  isCalled = false,
  assets,
}: Avatar3DProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const jumpStartClockRef = useRef<number>(-999);
  const lastTriggerPropRef = useRef<number>(jumpTriggerTimestamp);
  const prevCalledRef = useRef<boolean>(false);

  const phase = useMemo(() => hashStudentPhase(studentId), [studentId]);
  const [gltfData, setGltfData] = useState<{
    clone: THREE.Object3D;
    mixer: THREE.AnimationMixer | null;
    jumpAction: THREE.AnimationAction | null;
  } | null>(null);

  useEffect(() => {
    const triggeredByAward =
      jumpTriggerTimestamp > 0 &&
      jumpTriggerTimestamp !== lastTriggerPropRef.current;
    const triggeredByCall = isCalled && !prevCalledRef.current;

    lastTriggerPropRef.current = jumpTriggerTimestamp;
    prevCalledRef.current = isCalled;

    if (triggeredByAward || triggeredByCall) {
      jumpStartClockRef.current = -1; // Signal to capture clock.elapsedTime on next frame
      if (gltfData?.jumpAction) {
        gltfData.jumpAction.reset().setLoop(THREE.LoopOnce, 1).play();
      }
    }
  }, [jumpTriggerTimestamp, isCalled, gltfData]);

  useEffect(() => {
    let cancelled = false;
    if (!assets) {
      setGltfData(null);
      return;
    }

    void assets.get(avatarId, { priority: 'high' }).then((loaded) => {
      if (cancelled) return;
      if (loaded && loaded.scene) {
        const clone = SkeletonUtils.clone(loaded.scene);
        let mixer: THREE.AnimationMixer | null = null;
        let jumpAction: THREE.AnimationAction | null = null;
        if (loaded.animations && loaded.animations.length > 0) {
          mixer = new THREE.AnimationMixer(clone);
          const clips = loaded.animations as THREE.AnimationClip[];
          const walkClip =
            THREE.AnimationClip.findByName(clips, 'Walk') ??
            THREE.AnimationClip.findByName(clips, 'Idle') ??
            clips[0];
          if (walkClip) {
            mixer.clipAction(walkClip).play();
          }
          const jumpClip = THREE.AnimationClip.findByName(clips, 'Jump');
          if (jumpClip) {
            jumpAction = mixer.clipAction(jumpClip);
            jumpAction.clampWhenFinished = false;
          }
        }
        setGltfData({ clone, mixer, jumpAction });
      } else {
        setGltfData(null);
      }
    });

    return () => {
      cancelled = true;
      assets.release(avatarId);
    };
  }, [assets, avatarId]);

  useEffect(() => {
    return () => {
      if (gltfData) {
        gltfData.mixer?.stopAllAction();
        disposeObject3D(gltfData.clone);
      }
    };
  }, [gltfData]);

  // Convert world-space patrolA & patrolB into local lot-space coordinates
  const localPatrol = useMemo(() => {
    const cos = Math.cos(-lotRotationY);
    const sin = Math.sin(-lotRotationY);
    const toLocal = (wx: number, wz: number): [number, number] => {
      const dx = wx - lotPosition[0];
      const dz = wz - lotPosition[2];
      return [dx * cos - dz * sin, dx * sin + dz * cos];
    };
    return {
      a: toLocal(patrolA[0], patrolA[1]),
      b: toLocal(patrolB[0], patrolB[1]),
    };
  }, [patrolA, patrolB, lotPosition, lotRotationY]);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;

    const t = clock.elapsedTime;
    if (gltfData?.mixer) {
      gltfData.mixer.update(delta);
    }

    if (jumpStartClockRef.current === -1) {
      jumpStartClockRef.current = t;
    }

    const jumpElapsed = t - jumpStartClockRef.current;
    const isJumping = jumpElapsed >= 0 && jumpElapsed < 1.25;

    if (reducedMotion) {
      root.position.set(
        (localPatrol.a[0] + localPatrol.b[0]) * 0.5,
        0,
        (localPatrol.a[1] + localPatrol.b[1]) * 0.5
      );
      body.position.y = isJumping ? 0.35 : 0;
      return;
    }

    // Sinusoidal patrol interpolation between localPatrol.a and localPatrol.b
    const walkSpeed = 0.85;
    const sinVal = Math.sin(t * walkSpeed + phase);
    const cosVal = Math.cos(t * walkSpeed + phase);
    const u = 0.5 + 0.5 * sinVal;

    const lx = localPatrol.a[0] + (localPatrol.b[0] - localPatrol.a[0]) * u;
    const lz = localPatrol.a[1] + (localPatrol.b[1] - localPatrol.a[1]) * u;

    root.position.x = lx;
    root.position.z = lz;

    // Facing direction along walk velocity vector
    const dirSign = cosVal >= 0 ? 1 : -1;
    const dirX = (localPatrol.b[0] - localPatrol.a[0]) * dirSign;
    const dirZ = (localPatrol.b[1] - localPatrol.a[1]) * dirSign;
    if (Math.abs(dirX) > 1e-4 || Math.abs(dirZ) > 1e-4) {
      body.rotation.y = Math.atan2(dirX, dirZ);
    }

    if (isJumping) {
      // Celebratory jump bounce + spin when called or awarded points
      body.position.y = Math.abs(Math.sin(jumpElapsed * 9.5)) * 0.85;
      body.rotation.y += jumpElapsed * 5.0;
      body.rotation.z = 0;
    } else {
      // Walking footstep bobbing
      const stepBob = Math.abs(Math.sin(t * 6.5 + phase)) * 0.11;
      const sway = Math.sin(t * 6.5 + phase) * 0.06;
      body.position.y = stepBob;
      body.rotation.z = sway;
    }
  });

  return (
    <group ref={rootRef} position={[0, 0, 3.8]}>
      <BlobShadow radius={0.44} y={0.03} />
      <group ref={bodyRef}>
        {gltfData ? (
          <primitive object={gltfData.clone} />
        ) : (
          <AvatarProcedural avatarId={avatarId} />
        )}
      </group>
    </group>
  );
}
