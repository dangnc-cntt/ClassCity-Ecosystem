import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { AssetService } from '../../../../platform/assets/assetService';
import type { SoundEffectsService } from '../../../../platform/audio/soundEffects';
import type { TelemetryPort } from '../../../../platform/ports/telemetry';
import { PerfGovernor } from '../../../../three-kit/PerfGovernor';
import { WONDER_CENTER } from '../../config/cityLayout';
import { useClassStore } from '../../state/useClassStore';
import { CameraController } from './CameraController';
import { ClassWonder } from './ClassWonder';
import { FloatingIsland } from './FloatingIsland';
import { GiftBoxes } from './GiftBoxes';
import { PatrolVehicle } from './PatrolVehicle';
import { RoadNetwork } from './RoadNetwork';
import { StudentLot } from './StudentLot';
import { Weather } from './Weather';

const NEAR_CAMERA_DIST_SQ = 38 * 38;

const WEATHER_PRESETS = {
  sunny: {
    sky: new THREE.Color('#E0F2FE'),
    hemiSky: new THREE.Color('#FFFBEB'),
    ambient: 0.78,
    hemi: 0.55,
    dir: 1.35,
  },
  rainbow: {
    sky: new THREE.Color('#BAE6FD'),
    hemiSky: new THREE.Color('#FFFBEB'),
    ambient: 0.78,
    hemi: 0.55,
    dir: 1.35,
  },
  rainy: {
    sky: new THREE.Color('#334155'),
    hemiSky: new THREE.Color('#94A3B8'),
    ambient: 0.55,
    hemi: 0.35,
    dir: 0.7,
  },
} as const;

export interface CitySceneProps {
  cameraRef?: MutableRefObject<THREE.Camera | null>;
  assets?: AssetService;
  telemetry?: TelemetryPort;
  sound?: SoundEffectsService;
  onAutoDriveArrived?: (lotId: number) => void;
  onCollectGiftBox?: (boxId: string, studentId: string) => void;
}

/**
 * Main 3D scene assembling lighting, fog, PerfGovernor, Weather, RoadNetwork,
 * 36-40 StudentLots (with shops + wandering avatars), GiftBoxes, PatrolVehicle,
 * ClassWonder, and CameraController (Rule 8 & GÄ4-GÄ5).
 */
export function CityScene({
  cameraRef,
  assets,
  telemetry,
  sound,
  onAutoDriveArrived,
  onCollectGiftBox,
}: CitySceneProps) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    if (cameraRef) {
      cameraRef.current = camera;
    }
    return () => {
      if (cameraRef) {
        cameraRef.current = null;
      }
    };
  }, [camera, cameraRef]);
  const [qualityTier, setQualityTier] = useState<'high' | 'medium' | 'low'>('high');
  const [nearLotIds, setNearLotIds] = useState<ReadonlySet<number>>(() => new Set());

  const {
    students,
    layout,
    wonderProgress,
    pointsPerLevel,
    weatherMode,
    lowPowerMode,
    selectStudent,
  } = useClassStore(
    useShallow((s) => ({
      students: s.students,
      layout: s.layout,
      wonderProgress: s.wonderProgress,
      pointsPerLevel: s.pointsPerLevel,
      weatherMode: s.weatherMode,
      lowPowerMode: s.lowPowerMode,
      selectStudent: s.selectStudent,
    }))
  );

  // Update the set of "near camera" lots every ~250ms instead of every frame (Rule 8.4)
  useEffect(() => {
    const updateNearSet = () => {
      if (qualityTier === 'low' || lowPowerMode) {
        setNearLotIds((prev) => (prev.size === 0 ? prev : new Set()));
        return;
      }
      const cx = camera.position.x;
      const cy = camera.position.y;
      const cz = camera.position.z;
      const next = new Set<number>();
      for (const lot of layout.lots) {
        const dx = lot.position[0] - cx;
        const dy = lot.position[1] - cy;
        const dz = lot.position[2] - cz;
        if (dx * dx + dy * dy + dz * dz <= NEAR_CAMERA_DIST_SQ) {
          next.add(lot.id);
        }
      }
      setNearLotIds(next);
    };

    updateNearSet();
    const timer = setInterval(updateNearSet, 250);
    return () => clearInterval(timer);
  }, [camera, layout.lots, qualityTier, lowPowerMode]);

  const bgColorRef = useRef<THREE.Color>(null);
  const fogRef = useRef<THREE.Fog>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useFrame((_, delta) => {
    const target = WEATHER_PRESETS[weatherMode];
    const alpha = reducedMotion ? 1 : Math.min(1, delta * 3.2);

    if (bgColorRef.current) {
      bgColorRef.current.lerp(target.sky, alpha);
    }
    if (fogRef.current) {
      fogRef.current.color.lerp(target.sky, alpha);
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        target.ambient,
        alpha
      );
    }
    if (hemiRef.current) {
      hemiRef.current.color.lerp(target.hemiSky, alpha);
      hemiRef.current.intensity = THREE.MathUtils.lerp(
        hemiRef.current.intensity,
        target.hemi,
        alpha
      );
    }
    if (dirLightRef.current) {
      dirLightRef.current.intensity = THREE.MathUtils.lerp(
        dirLightRef.current.intensity,
        target.dir,
        alpha
      );
    }
  });

  const enableShadows = qualityTier !== 'low' && !lowPowerMode;

  return (
    <>
      <color ref={bgColorRef} attach="background" args={['#E0F2FE']} />
      <fog ref={fogRef} attach="fog" args={['#E0F2FE', 130, 380]} />

      <FloatingIsland reducedMotion={reducedMotion} />

      {/* Soft warm bounce light from below so the island underside never reads as flat black */}
      <directionalLight position={[14, -60, 24]} intensity={0.7} color="#FDE68A" />

      <PerfGovernor
        lowPowerMode={lowPowerMode}
        onQualityChange={setQualityTier}
        onLowFpsDetected={(fps) => {
          telemetry?.track('low_fps_detected', { fps });
        }}
      />

      {/* Warm classroom sunlight + soft hemisphere ambient (smoothly lerped on weather change) */}
      <ambientLight ref={ambientRef} intensity={0.78} />
      <hemisphereLight
        ref={hemiRef}
        args={['#FFFBEB', '#15803D', 0.55]}
      />
      <directionalLight
        ref={dirLightRef}
        position={[38, 56, 32]}
        intensity={1.35}
        castShadow={enableShadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={10}
        shadow-camera-far={190}
        shadow-bias={-0.0005}
      />

      <Weather
        mode={weatherMode}
        lowPowerMode={lowPowerMode || qualityTier === 'low'}
      />

      {/* Clicking empty ground clears student selection */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          selectStudent(null);
        }}
      >
        <RoadNetwork emptyLots={layout.emptyLots} />
      </group>

      <group position={WONDER_CENTER}>
        <ClassWonder
          wonderProgress={wonderProgress}
          studentCount={Math.max(1, students.length)}
          pointsPerLevel={pointsPerLevel}
        />
      </group>

      <GiftBoxes />

      <PatrolVehicle
        sound={sound}
        onAutoDriveArrived={onAutoDriveArrived}
        onCollectGiftBox={onCollectGiftBox}
      />

      {/* Render each student's lot, 3D shop, and wandering avatar */}
      {students.map((stu) => {
        const lot = layout.lots.find((l) => l.id === stu.lotNumber);
        if (!lot) return null;
        return (
          <StudentLot
            key={stu.id}
            lot={lot}
            studentId={stu.id}
            isNearCamera={nearLotIds.has(lot.id)}
            assets={assets}
            castShadow={enableShadows}
          />
        );
      })}

      <CameraController />
    </>
  );
}
