import { useEffect, useMemo, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useShallow } from 'zustand/react/shallow';
import { useClassStore } from '../../state/useClassStore';

const OVERVIEW_POS: [number, number, number] = [0, 52, 84];
const OVERVIEW_TARGET: [number, number, number] = [0, 1.5, 4];

/**
 * Manages the 3D camera with OrbitControls and smooth GSAP focus transitions (Rule 6.1, 6.4 & R5).
 */
export function CameraController() {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);
  const interactingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const { selectedStudentId, calledStudentId, vehicleState, students, lots } =
    useClassStore(
      useShallow((s) => ({
        selectedStudentId: s.selectedStudentId,
        calledStudentId: s.calledStudentId,
        vehicleState: s.vehicleState,
        students: s.students,
        lots: s.layout.lots,
      }))
    );

  useEffect(() => {
    const focusStudentId =
      vehicleState === 'called' || vehicleState === 'cameraZoom'
        ? calledStudentId
        : selectedStudentId;

    const controls = controlsRef.current;
    if (!controls) return;

    tweenRef.current?.kill();

    if (!focusStudentId) {
      // Smoothly return to city overview when callout/selection is cleared
      const tl = gsap.timeline();
      tl.to(
        camera.position,
        {
          x: OVERVIEW_POS[0],
          y: OVERVIEW_POS[1],
          z: OVERVIEW_POS[2],
          duration: 0.9,
          ease: 'power2.out',
        },
        0
      );
      tl.to(
        controls.target,
        {
          x: OVERVIEW_TARGET[0],
          y: OVERVIEW_TARGET[1],
          z: OVERVIEW_TARGET[2],
          duration: 0.9,
          ease: 'power2.out',
          onUpdate: () => {
            controls.update();
          },
        },
        0
      );
      tweenRef.current = tl;
      return () => {
        tl.kill();
      };
    }

    const student = students.find((s) => s.id === focusStudentId);
    const lot = student ? lots.find((l) => l.id === student.lotNumber) : null;
    if (!lot) return;

    const [camX, camY, camZ] = lot.cameraFocus.position;
    const [lookX, lookY, lookZ] = lot.cameraFocus.lookAt;

    const tl = gsap.timeline();
    tl.to(
      camera.position,
      {
        x: camX,
        y: camY,
        z: camZ,
        duration: 0.85,
        ease: 'power3.out',
      },
      0
    );
    tl.to(
      controls.target,
      {
        x: lookX,
        y: lookY,
        z: lookZ,
        duration: 0.85,
        ease: 'power3.out',
        onUpdate: () => {
          controls.update();
        },
      },
      0
    );
    tweenRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [selectedStudentId, calledStudentId, vehicleState, students, lots, camera]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  // Idle showcase rotation: only while no student is focused and the vehicle is idle,
  // paused while the user drags/zooms and resumed shortly after (skipped for reduced motion)
  const shouldAutoRotate =
    !reducedMotion &&
    !selectedStudentId &&
    !calledStudentId &&
    vehicleState === 'idle';

  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.autoRotate = shouldAutoRotate && !interactingRef.current;
  });

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      autoRotate={false}
      autoRotateSpeed={0.9}
      minDistance={10}
      maxDistance={200}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI * 0.62}
      target={OVERVIEW_TARGET}
      onStart={() => {
        interactingRef.current = true;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      }}
      onEnd={() => {
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          interactingRef.current = false;
        }, 3000);
      }}
    />
  );
}
