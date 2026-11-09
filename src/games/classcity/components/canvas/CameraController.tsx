import { useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useShallow } from 'zustand/react/shallow';
import { useClassStore } from '../../state/useClassStore';

const OVERVIEW_POS: [number, number, number] = [0, 42, 58];
const OVERVIEW_TARGET: [number, number, number] = [0, 1.5, 0];

/**
 * Manages the 3D camera with OrbitControls and smooth GSAP focus transitions (Rule 6.1, 6.4 & R5).
 */
export function CameraController() {
  const camera = useThree((s) => s.camera);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);

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

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={10}
      maxDistance={95}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 - 0.08}
      target={OVERVIEW_TARGET}
    />
  );
}
