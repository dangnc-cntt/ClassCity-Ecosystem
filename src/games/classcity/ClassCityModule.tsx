import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import confetti from 'canvas-confetti';
import { useShallow } from 'zustand/react/shallow';
import { createSoundEffects } from '../../platform/audio/soundEffects';
import { registerMessages, t } from '../../platform/i18n';
import type { GameContext } from '../../platform/types/manifest';
import { CityScene } from './components/canvas/CityScene';
import { calculateWonderProgress } from './domain/levels';
import { classCityEn } from './locales/en';
import { classCityVi } from './locales/vi';
import type { VehicleKind, WeatherMode } from './state/types';
import { createClassCityUseCases } from './state/useCases';
import { useClassStore } from './state/useClassStore';

registerMessages('vi', classCityVi);
registerMessages('en', classCityEn);

interface CanvasErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  override state: CanvasErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env?.DEV) {
      console.debug('[CanvasErrorBoundary]', error, info);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface ClassCityModuleProps {
  ctx?: GameContext;
}

export function ClassCityModule({ ctx }: ClassCityModuleProps) {
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasCleanupRef = useRef<(() => void) | null>(null);

  const useCases = useMemo(
    () => (ctx ? createClassCityUseCases(ctx) : null),
    [ctx]
  );

  const sound = useMemo(
    () =>
      createSoundEffects({
        initialMuted: ctx?.audio.muted ?? false,
        bus: ctx?.bus,
      }),
    [ctx]
  );

  useEffect(() => {
    return () => {
      canvasCleanupRef.current?.();
      canvasCleanupRef.current = null;
      void sound.dispose();
    };
  }, [sound]);

  useEffect(() => {
    if (!useCases || !ctx) return;
    void useCases.loadClassroom(ctx.classroomId);

    const unsubRemoteAward = ctx.bus.on('LEDGER:POINTS_AWARDED', (evt) => {
      if (evt.source.gameId !== 'classcity') {
        useCases.applyRemoteAward(evt);
      }
    });

    return () => {
      unsubRemoteAward();
    };
  }, [useCases, ctx]);

  const {
    classrooms,
    activeClassroomId,
    students,
    selectedStudentId,
    calledStudentId,
    nearestManualLotId,
    vehicleState,
    vehicleKind,
    weatherMode,
    wonderProgress,
    pointsPerLevel,
    activeModal,
    lastLevelUp,
    useDoublePointsOnNextAward,
    selectStudent,
    setUseDoublePointsOnNextAward,
  } = useClassStore(
    useShallow((s) => ({
      classrooms: s.classrooms,
      activeClassroomId: s.activeClassroomId,
      students: s.students,
      selectedStudentId: s.selectedStudentId,
      calledStudentId: s.calledStudentId,
      nearestManualLotId: s.nearestManualLotId,
      vehicleState: s.vehicleState,
      vehicleKind: s.vehicleKind,
      weatherMode: s.weatherMode,
      wonderProgress: s.wonderProgress,
      pointsPerLevel: s.pointsPerLevel,
      activeModal: s.activeModal,
      lastLevelUp: s.lastLevelUp,
      useDoublePointsOnNextAward: s.useDoublePointsOnNextAward,
      selectStudent: s.selectStudent,
      setUseDoublePointsOnNextAward: s.setUseDoublePointsOnNextAward,
    }))
  );

  // Celebrate level-up with confetti & fanfare
  useEffect(() => {
    if (!lastLevelUp) return;
    sound.playFanfare();
    try {
      void confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore confetti errors in headless tests
    }
  }, [lastLevelUp, sound]);

  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const calledStudent = students.find((s) => s.id === calledStudentId);
  const wonderInfo = calculateWonderProgress(
    wonderProgress,
    Math.max(1, students.length),
    pointsPerLevel
  );

  const isAutoDriving =
    vehicleState === 'accelerating' ||
    vehicleState === 'cruising' ||
    vehicleState === 'decelerating';

  const handleQuickAward = (studentId: string, delta: number, reason: string) => {
    if (!useCases) return;
    sound.playPointAward(delta);
    void useCases.awardPoints({ studentId, delta, reason });
  };

  const unusedDoublePerks =
    calledStudent?.perks.filter((p) => p.kind === 'double_points' && !p.usedAt)
      .length ?? 0;

  const fallback2D = (
    <div className="flex h-full w-full flex-col bg-slate-950 p-6 text-slate-100">
      <h2 className="text-lg font-bold text-teal-400">
        {t('city.webglFallbackTitle')}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
        {students.map((stu) => (
          <button
            key={stu.id}
            type="button"
            onClick={() => selectStudent(stu.id)}
            className="flex flex-col rounded-lg border border-slate-800 bg-slate-900 p-3 text-left hover:border-teal-500"
          >
            <span className="text-xs font-bold text-teal-400">
              #{stu.studentCode} • Lv.{stu.level}
            </span>
            <span className="mt-1 font-semibold text-white">{stu.name}</span>
            <span className="mt-1 text-xs text-amber-300">
              {stu.totalPoints} pts
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Screen-reader live region (Rule 3.2 a11y) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {calledStudent && activeModal === 'callout'
          ? t('callout.title', {
              code: calledStudent.studentCode,
              name: calledStudent.name,
            })
          : selectedStudent
            ? t('city.selectedLot', {
                code: selectedStudent.studentCode,
                name: selectedStudent.name,
                level: selectedStudent.level,
                points: selectedStudent.totalPoints,
              })
            : t('city.ready')}
      </div>

      {/* Top interactive overlay bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-teal-400">
              {t('app.title')}
            </span>
            <span className="text-xs font-bold text-white">
              {activeClassroom?.name ?? activeClassroomId} •{' '}
              {t('city.studentCount', { count: students.length })}
            </span>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-amber-300">
              {t('city.wonderProgress', {
                percent: wonderInfo.percent,
                stage: wonderInfo.stage,
              })}
            </span>
            <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full origin-left bg-amber-400 transition-transform duration-300"
                style={{ transform: `scaleX(${wonderInfo.ratio})` }}
              />
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700" />

          {/* Auto-Drive button */}
          <button
            type="button"
            disabled={isAutoDriving}
            onClick={() => useCases?.startAutoDrive()}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow hover:bg-amber-400 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {isAutoDriving ? t('city.autoDriving') : t('city.autoDrive')}
          </button>

          {/* Manual call nearest lot button when parked near a shop */}
          {nearestManualLotId !== null && !isAutoDriving && (
            <button
              type="button"
              onClick={() => void useCases?.callStudentByLot(nearestManualLotId)}
              className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              {t('city.manualCallLot', { code: nearestManualLotId })}
            </button>
          )}

          {/* Vehicle Kind Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1">
            {(['car', 'ambulance', 'ufo'] as const).map((vk: VehicleKind) => (
              <button
                key={vk}
                type="button"
                onClick={() => void useCases?.setVehicleKind(vk)}
                className={
                  vehicleKind === vk
                    ? 'rounded-md bg-teal-600 px-2 py-1 text-[11px] font-bold text-white'
                    : 'rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700'
                }
              >
                {t(`city.vehicle.${vk}`)}
              </button>
            ))}
          </div>

          {/* Weather Switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1">
            {(['sunny', 'rainbow', 'rainy'] as const).map((wm: WeatherMode) => (
              <button
                key={wm}
                type="button"
                onClick={() => void useCases?.setWeatherMode(wm)}
                className={
                  weatherMode === wm
                    ? 'rounded-md bg-sky-600 px-2 py-1 text-[11px] font-bold text-white'
                    : 'rounded-md px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700'
                }
              >
                {t(`city.weather.${wm}`)}
              </button>
            ))}
          </div>
        </div>

        {selectedStudent && activeModal !== 'callout' && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-teal-500/50 bg-slate-900/95 px-3.5 py-2 shadow-lg">
            <span className="text-xs font-bold text-teal-300">
              {t('city.selectedLot', {
                code: selectedStudent.studentCode,
                name: selectedStudent.name,
                level: selectedStudent.level,
                points: selectedStudent.totalPoints,
              })}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleQuickAward(selectedStudent.id, 1, 'participate')
                }
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500"
              >
                {t('city.awardPlus1')}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAward(selectedStudent.id, 2, 'good_work')
                }
                className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-500"
              >
                {t('city.awardPlus2')}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAward(selectedStudent.id, 5, 'excellent')
                }
                className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400"
              >
                {t('city.awardPlus5')}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickAward(selectedStudent.id, -1, 'reminder')
                }
                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
              >
                {t('city.awardMinus1')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => selectStudent(null)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {t('city.resetCamera')}
            </button>
          </div>
        )}
      </header>

      {/* Callout Modal when PatrolVehicle stops at a student's lot */}
      {activeModal === 'callout' && calledStudent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="callout-dialog-title"
          className="fixed inset-x-0 bottom-6 z-30 mx-auto max-w-lg rounded-2xl border-2 border-amber-400 bg-slate-900/95 p-5 text-center shadow-2xl"
        >
          <h2
            id="callout-dialog-title"
            className="text-lg font-extrabold text-amber-300"
          >
            {t('callout.title', {
              code: calledStudent.studentCode,
              name: calledStudent.name,
            })}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-300">
            {t('callout.subtitle', {
              level: calledStudent.level,
              points: calledStudent.totalPoints,
            })}
          </p>

          {unusedDoublePerks > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  setUseDoublePointsOnNextAward(!useDoublePointsOnNextAward)
                }
                className={
                  useDoublePointsOnNextAward
                    ? 'rounded-full bg-purple-600 px-3 py-1 text-xs font-bold text-white ring-2 ring-amber-300'
                    : 'rounded-full border border-purple-400/50 bg-purple-950/60 px-3 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-900/70'
                }
              >
                {useDoublePointsOnNextAward
                  ? t('callout.doublePerkActive')
                  : t('callout.useDoublePerk', { count: unusedDoublePerks })}
              </button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleQuickAward(calledStudent.id, 1, 'callout_plus_1')
              }
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
            >
              {t('city.awardPlus1')}
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickAward(calledStudent.id, 2, 'callout_plus_2')
              }
              className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-teal-500"
            >
              {t('city.awardPlus2')}
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickAward(calledStudent.id, 5, 'callout_plus_5')
              }
              className="rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              {t('city.awardPlus5')}
            </button>
            <button
              type="button"
              onClick={() =>
                handleQuickAward(calledStudent.id, -1, 'callout_minus_1')
              }
              className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-500"
            >
              {t('city.awardMinus1')}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-3 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => useCases?.startAutoDrive()}
              className="rounded-lg bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
            >
              {t('callout.callAnother')}
            </button>
            <button
              type="button"
              onClick={() => {
                useCases?.dismissCallout();
                selectStudent(null);
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {t('callout.close')}
            </button>
          </div>
        </div>
      )}

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/90">
          <p className="rounded-xl border border-amber-500/40 bg-slate-900 px-6 py-4 text-sm font-semibold text-amber-300">
            {t('city.webglContextLost')}
          </p>
        </div>
      )}

      <CanvasErrorBoundary fallback={fallback2D}>
        <Canvas
          key={canvasKey}
          dpr={[1, 1.5]}
          shadows
          camera={{ position: [0, 42, 58], fov: 45, near: 0.5, far: 220 }}
          gl={{ antialias: false, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            canvasCleanupRef.current?.();
            const canvas = gl.domElement;
            const handleLost = (e: Event) => {
              e.preventDefault();
              setContextLost(true);
            };
            const handleRestored = () => {
              setContextLost(false);
              setCanvasKey((k) => k + 1);
            };
            canvas.addEventListener('webglcontextlost', handleLost, false);
            canvas.addEventListener(
              'webglcontextrestored',
              handleRestored,
              false
            );
            canvasCleanupRef.current = () => {
              canvas.removeEventListener('webglcontextlost', handleLost, false);
              canvas.removeEventListener(
                'webglcontextrestored',
                handleRestored,
                false
              );
            };
          }}
        >
          <CityScene
            assets={ctx?.assets}
            telemetry={ctx?.telemetry}
            sound={sound}
            onAutoDriveArrived={(lotId) => {
              void useCases?.callStudentByLot(lotId);
            }}
            onCollectGiftBox={(boxId, studentId) => {
              void useCases?.collectGiftBoxForStudent(boxId, studentId);
            }}
          />
        </Canvas>
      </CanvasErrorBoundary>
    </main>
  );
}
