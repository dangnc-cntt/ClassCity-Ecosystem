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
import { useShallow } from 'zustand/react/shallow';
import { registerMessages, t } from '../../platform/i18n';
import type { GameContext } from '../../platform/types/manifest';
import { CityScene } from './components/canvas/CityScene';
import { calculateWonderProgress } from './domain/levels';
import { classCityEn } from './locales/en';
import { classCityVi } from './locales/vi';
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

  useEffect(() => {
    return () => {
      canvasCleanupRef.current?.();
      canvasCleanupRef.current = null;
    };
  }, []);

  const useCases = useMemo(
    () => (ctx ? createClassCityUseCases(ctx) : null),
    [ctx]
  );

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
    wonderProgress,
    pointsPerLevel,
    selectStudent,
  } = useClassStore(
    useShallow((s) => ({
      classrooms: s.classrooms,
      activeClassroomId: s.activeClassroomId,
      students: s.students,
      selectedStudentId: s.selectedStudentId,
      wonderProgress: s.wonderProgress,
      pointsPerLevel: s.pointsPerLevel,
      selectStudent: s.selectStudent,
    }))
  );

  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId);
  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const wonderInfo = calculateWonderProgress(
    wonderProgress,
    Math.max(1, students.length),
    pointsPerLevel
  );

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
        {selectedStudent
          ? t('city.selectedLot', {
              code: selectedStudent.studentCode,
              name: selectedStudent.name,
              level: selectedStudent.level,
              points: selectedStudent.totalPoints,
            })
          : t('city.ready')}
      </div>

      {/* Top status overlay bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/95 px-4 py-2.5 shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-teal-400">
              {t('app.title')}
            </span>
            <span className="text-sm font-bold text-white">
              {activeClassroom?.name ?? activeClassroomId} •{' '}
              {t('city.studentCount', { count: students.length })}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-amber-300">
              {t('city.wonderProgress', {
                percent: wonderInfo.percent,
                stage: wonderInfo.stage,
              })}
            </span>
            <div className="mt-1 h-2 w-40 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-amber-400 transition-transform duration-300 origin-left"
                style={{ transform: `scaleX(${wonderInfo.ratio})` }}
              />
            </div>
          </div>
        </div>

        {selectedStudent && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-teal-500/50 bg-slate-900/95 px-4 py-2 shadow-lg">
            <span className="text-xs font-bold text-teal-300">
              {t('city.selectedLot', {
                code: selectedStudent.studentCode,
                name: selectedStudent.name,
                level: selectedStudent.level,
                points: selectedStudent.totalPoints,
              })}
            </span>
            {useCases && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void useCases.awardPoints({
                      studentId: selectedStudent.id,
                      delta: 1,
                      reason: 'participate',
                    })
                  }
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                >
                  {t('city.awardPlus1')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void useCases.awardPoints({
                      studentId: selectedStudent.id,
                      delta: 2,
                      reason: 'good_work',
                    })
                  }
                  className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {t('city.awardPlus2')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void useCases.awardPoints({
                      studentId: selectedStudent.id,
                      delta: 5,
                      reason: 'excellent',
                    })
                  }
                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  {t('city.awardPlus5')}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void useCases.awardPoints({
                      studentId: selectedStudent.id,
                      delta: -1,
                      reason: 'reminder',
                    })
                  }
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400"
                >
                  {t('city.awardMinus1')}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => selectStudent(null)}
              className="rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {t('city.resetCamera')}
            </button>
          </div>
        )}
      </header>

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
          <CityScene assets={ctx?.assets} telemetry={ctx?.telemetry} />
        </Canvas>
      </CanvasErrorBoundary>
    </main>
  );
}
