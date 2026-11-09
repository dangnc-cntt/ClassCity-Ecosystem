import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { useShallow } from 'zustand/react/shallow';
import type { AssetService } from '../../../../platform/assets/assetService';
import type { TelemetryPort } from '../../../../platform/ports/telemetry';
import { PerfGovernor } from '../../../../three-kit/PerfGovernor';
import { useClassStore } from '../../state/useClassStore';
import { CameraController } from './CameraController';
import { ClassWonder } from './ClassWonder';
import { RoadNetwork } from './RoadNetwork';
import { StudentLot } from './StudentLot';

const NEAR_CAMERA_DIST_SQ = 38 * 38;

export interface CitySceneProps {
  assets?: AssetService;
  telemetry?: TelemetryPort;
}

/**
 * Main 3D scene assembling lighting, fog, PerfGovernor, RoadNetwork, 36-40 StudentLots,
 * ClassWonder, and CameraController (Rule 8 & GĐ4).
 */
export function CityScene({ assets, telemetry }: CitySceneProps) {
  const camera = useThree((s) => s.camera);
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
      const cz = camera.position.z;
      const next = new Set<number>();
      for (const lot of layout.lots) {
        const dx = lot.position[0] - cx;
        const dz = lot.position[2] - cz;
        if (dx * dx + dz * dz <= NEAR_CAMERA_DIST_SQ) {
          next.add(lot.id);
        }
      }
      setNearLotIds(next);
    };

    updateNearSet();
    const timer = setInterval(updateNearSet, 250);
    return () => clearInterval(timer);
  }, [camera, layout.lots, qualityTier, lowPowerMode]);

  const skyColor =
    weatherMode === 'rainy'
      ? '#334155'
      : weatherMode === 'rainbow'
        ? '#BAE6FD'
        : '#E0F2FE';

  const enableShadows = qualityTier !== 'low' && !lowPowerMode;

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fog attach="fog" args={[skyColor, 65, 145]} />

      <PerfGovernor
        lowPowerMode={lowPowerMode}
        onQualityChange={setQualityTier}
        onLowFpsDetected={(fps) => {
          telemetry?.track('low_fps_detected', { fps });
        }}
      />

      {/* Warm classroom sunlight + soft hemisphere ambient */}
      <ambientLight intensity={weatherMode === 'rainy' ? 0.55 : 0.78} />
      <hemisphereLight
        args={[
          weatherMode === 'rainy' ? '#94A3B8' : '#FFFBEB',
          '#15803D',
          weatherMode === 'rainy' ? 0.35 : 0.55,
        ]}
      />
      <directionalLight
        position={[38, 56, 32]}
        intensity={weatherMode === 'rainy' ? 0.7 : 1.35}
        castShadow={enableShadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={10}
        shadow-camera-far={130}
        shadow-bias={-0.0005}
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

      <ClassWonder
        wonderProgress={wonderProgress}
        studentCount={Math.max(1, students.length)}
        pointsPerLevel={pointsPerLevel}
      />

      {/* Render each student's lot and 3D shop */}
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
