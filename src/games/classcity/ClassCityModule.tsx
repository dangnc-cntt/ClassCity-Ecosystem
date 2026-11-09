import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import confetti from 'canvas-confetti';
import { X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../lib/cn';
import { createSoundEffects } from '../../platform/audio/soundEffects';
import { registerMessages, t } from '../../platform/i18n';
import type { GameContext } from '../../platform/types/manifest';
import { CityScene } from './components/canvas/CityScene';
import { CalloutModal } from './components/ui/CalloutModal';
import { StudentSidebar } from './components/ui/StudentSidebar';
import { TopToolbar } from './components/ui/TopToolbar';
import { classCityEn } from './locales/en';
import { classCityVi } from './locales/vi';
import { createClassCityUseCases } from './state/useCases';
import { useClassStore } from './state/useClassStore';

const LeaderboardModal = lazy(
  () => import('./components/ui/LeaderboardModal')
);
const SettingsModal = lazy(() => import('./components/ui/SettingsModal'));
const ImportExportModal = lazy(
  () => import('./components/ui/ImportExportModal')
);
const EcosystemModal = lazy(() => import('./components/ui/EcosystemModal'));

registerMessages('vi', classCityVi);
registerMessages('en', classCityEn);

function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

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

/**
 * Root ClassCity 3D game module combining the 2D HUD (`TopToolbar`, `StudentSidebar`,
 * native `<dialog>` modals) and the full-screen R3F `<Canvas>` city scene.
 */
export function ClassCityModule({ ctx }: ClassCityModuleProps) {
  const [webglAvailable] = useState<boolean>(() => detectWebGLSupport());
  const [contextLost, setContextLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const [entitlementVersion, setEntitlementVersion] = useState(0);
  const canvasCleanupRef = useRef<(() => void) | null>(null);

  const latestCtxRef = useRef<GameContext | undefined>(ctx);
  latestCtxRef.current = ctx;

  const stableProxyCtx = useMemo<GameContext | null>(() => {
    if (!ctx) return null;
    return {
      get user() {
        return latestCtxRef.current!.user;
      },
      get classroomId() {
        return latestCtxRef.current!.classroomId;
      },
      get repos() {
        return latestCtxRef.current!.repos;
      },
      get bus() {
        return latestCtxRef.current!.bus;
      },
      get assets() {
        return latestCtxRef.current!.assets;
      },
      get entitlements() {
        return latestCtxRef.current!.entitlements;
      },
      get permissions() {
        return latestCtxRef.current!.permissions;
      },
      get telemetry() {
        return latestCtxRef.current!.telemetry;
      },
      get audio() {
        return latestCtxRef.current!.audio;
      },
      get navigate() {
        return latestCtxRef.current!.navigate;
      },
    };
    // Only recreate if core platform bus/repos identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.repos, ctx?.bus]);

  const useCases = useMemo(
    () => (stableProxyCtx ? createClassCityUseCases(stableProxyCtx) : null),
    [stableProxyCtx]
  );

  const sound = useMemo(
    () =>
      createSoundEffects({
        initialMuted: ctx?.audio.muted ?? false,
        bus: ctx?.bus,
      }),
    // Only recreate if bus identity changes; mute updates sync via effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx?.bus]
  );

  useEffect(() => {
    if (ctx) {
      sound.setMuted(ctx.audio.muted);
    }
  }, [ctx, sound]);

  // Clean up WebGL context listeners and AudioContext on unmount (Rule R5)
  useEffect(() => {
    return () => {
      canvasCleanupRef.current?.();
      canvasCleanupRef.current = null;
      void sound.dispose();
    };
  }, [sound]);

  // Subscribe to entitlement changes so Free <-> Pro unlocks update immediately (Rule R7)
  useEffect(() => {
    const entitlements = ctx?.entitlements;
    if (!entitlements) return;
    return entitlements.subscribe(() => {
      setEntitlementVersion((v) => v + 1);
    });
  }, [ctx?.entitlements]);

  // Load classroom whenever active classroomId or useCases changes
  useEffect(() => {
    if (!useCases || !ctx?.classroomId) return;
    void useCases.loadClassroom(ctx.classroomId);
  }, [useCases, ctx?.classroomId]);

  // Subscribe to cross-game / cross-tab EcoEvents once per bus instance (Rule R5 & R10)
  useEffect(() => {
    const bus = ctx?.bus;
    if (!useCases || !bus) return;

    const unsubAward = bus.on('LEDGER:POINTS_AWARDED', (evt) => {
      const fromOtherInstance = evt.source.instanceId !== bus.instanceId;
      const fromOtherGame = evt.source.gameId !== 'classcity';
      if (fromOtherInstance || fromOtherGame) {
        useCases.applyRemoteAward(evt);
      }
    });

    const unsubAvatar = bus.on('PROFILE:AVATAR_CHANGED', (evt) => {
      if (evt.source.instanceId !== bus.instanceId) {
        useClassStore.setState((prev) => ({
          students: prev.students.map((s) =>
            s.id === evt.payload.studentId
              ? { ...s, equippedAvatarId: evt.payload.equippedAvatarId }
              : s
          ),
        }));
      }
    });

    const unsubClassroom = bus.on('CLASSROOM:CHANGED', (evt) => {
      if (evt.source.instanceId !== bus.instanceId) {
        void useCases.loadClassroom(evt.payload.classroomId);
      }
    });

    return () => {
      unsubAward();
      unsubAvatar();
      unsubClassroom();
    };
  }, [useCases, ctx?.bus]);

  const {
    students,
    selectedStudentId,
    calledStudentId,
    activeModal,
    lastLevelUp,
    lastAwardedStudent,
    toasts,
    locale,
    selectStudent,
    dismissToast,
  } = useClassStore(
    useShallow((s) => ({
      students: s.students,
      selectedStudentId: s.selectedStudentId,
      calledStudentId: s.calledStudentId,
      activeModal: s.activeModal,
      lastLevelUp: s.lastLevelUp,
      lastAwardedStudent: s.lastAwardedStudent,
      toasts: s.toasts,
      locale: s.locale,
      selectStudent: s.selectStudent,
      dismissToast: s.dismissToast,
    }))
  );

  void locale;
  void entitlementVersion;

  const canMultiClass = Boolean(ctx?.entitlements.has('classcity.multi_class'));
  const canExportCsv = Boolean(
    ctx?.entitlements.has('classcity.leaderboard_export')
  );

  // Celebrate level-up with fanfare + confetti (respecting prefers-reduced-motion)
  useEffect(() => {
    if (!lastLevelUp) return;
    sound.playFanfare();

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    try {
      void confetti({
        particleCount: 75,
        spread: 68,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore confetti errors in headless test environments
    }
  }, [lastLevelUp, sound]);

  // Auto-dismiss transient toast notifications after 4s (cleaned up on unmount)
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((notice) =>
      setTimeout(() => {
        dismissToast(notice.id);
      }, 4000)
    );
    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [toasts, dismissToast]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const calledStudent = students.find((s) => s.id === calledStudentId);
  const levelUpStudent = lastLevelUp
    ? students.find((s) => s.id === lastLevelUp.studentId)
    : undefined;
  const awardedStudent = lastAwardedStudent
    ? students.find((s) => s.id === lastAwardedStudent.studentId)
    : undefined;

  // Accessible screen-reader announcement string (toasts are never the sole channel)
  const liveAnnouncement = (() => {
    if (calledStudent && activeModal === 'callout') {
      return t('callout.title', {
        code: calledStudent.studentCode,
        name: calledStudent.name,
      });
    }
    if (levelUpStudent && lastLevelUp) {
      return t('city.announceLevelUp', {
        name: levelUpStudent.name,
        level: lastLevelUp.newLevel,
      });
    }
    if (
      awardedStudent &&
      lastAwardedStudent &&
      lastAwardedStudent.delta !== 0
    ) {
      const sign = lastAwardedStudent.delta > 0 ? '+' : '';
      return t('city.announceAward', {
        delta: `${sign}${lastAwardedStudent.delta}`,
        name: awardedStudent.name,
      });
    }
    if (selectedStudent) {
      return t('city.selectedLot', {
        code: selectedStudent.studentCode,
        name: selectedStudent.name,
        level: selectedStudent.level,
        points: selectedStudent.totalPoints,
      });
    }
    return t('city.ready');
  })();

  const fallback2D = (
    <div className="flex h-full w-full flex-col bg-[var(--surface)] p-6 pt-28 pr-[min(92vw,25rem)] text-[var(--ink-primary)]">
      <h2 className="text-xl font-extrabold text-teal-300 text-balance">
        {t('city.webglFallbackTitle')}
      </h2>
      <p className="mt-1 text-base text-[var(--ink-muted)] text-pretty">
        {t('city.webglFallbackDesc')}
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {students.map((stu) => (
          <li key={stu.id}>
            <button
              type="button"
              onClick={() => selectStudent(stu.id)}
              title={stu.name}
              className="flex w-full flex-col rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-3.5 text-left hover:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <span className="text-sm font-bold text-teal-300 tabular-nums">
                #{stu.studentCode} • {t('sidebar.levelBadge', { level: stu.level })}
              </span>
              <span className="mt-1 truncate text-base font-bold text-white">
                {stu.name}
              </span>
              <span className="mt-1 text-sm font-semibold text-amber-300 tabular-nums">
                {t('sidebar.pointsSummary', { points: stu.totalPoints })}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[var(--surface)] text-[var(--ink-primary)]">
      {/* Visually-hidden polite announcer for screen readers (fixing-accessibility) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* 1. Top Toolbar (first in keyboard Tab order) */}
      <TopToolbar
        useCases={useCases}
        sound={sound}
        canMultiClass={canMultiClass}
      />

      {/* 2. Collapsible Right Student Sidebar (second in keyboard Tab order) */}
      <StudentSidebar useCases={useCases} sound={sound} />

      {/* 3. Interactive 3D City Canvas Region (third in keyboard Tab order) */}
      <section
        aria-label={t('city.canvasAriaLabel')}
        className="relative z-0 h-full w-full"
      >
        {!webglAvailable ? (
          fallback2D
        ) : (
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
                  canvas.removeEventListener(
                    'webglcontextlost',
                    handleLost,
                    false
                  );
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
        )}
      </section>

      {/* WebGL Context Lost Overlay */}
      {contextLost && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/90">
          <p className="rounded-xl border border-amber-500/40 bg-[var(--surface)] px-6 py-4 text-base font-bold text-amber-300">
            {t('city.webglContextLost')}
          </p>
        </div>
      )}

      {/* Non-blocking Toast Notices */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed bottom-16 left-3 z-30 flex max-w-sm flex-col gap-2 pb-[env(safe-area-inset-bottom)]"
        >
          {toasts.map((notice) => (
            <div
              key={notice.id}
              className={cn(
                'pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-base font-semibold shadow-lg',
                notice.kind === 'error'
                  ? 'border-rose-500 bg-rose-950 text-rose-100'
                  : notice.kind === 'warning'
                    ? 'border-amber-400 bg-slate-900 text-amber-200'
                    : 'border-teal-500 bg-[var(--surface)] text-white'
              )}
            >
              <span>{notice.message}</span>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => dismissToast(notice.id)}
                className="rounded p-1 text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-teal-400"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Primary Callout Modal (eagerly loaded for instant post-drive response) */}
      <CalloutModal useCases={useCases} sound={sound} />

      {/* Secondary Modals (code-split via React.lazy per Rule 8.10) */}
      <Suspense fallback={null}>
        {activeModal === 'leaderboard' && (
          <LeaderboardModal
            useCases={useCases}
            canExportCsv={canExportCsv}
          />
        )}
        {activeModal === 'settings' && <SettingsModal useCases={useCases} />}
        {activeModal === 'import_export' && (
          <ImportExportModal useCases={useCases} />
        )}
        {(activeModal === 'ecosystem' || activeModal === 'upgrade_pro') && (
          <EcosystemModal
            useCases={useCases}
            bus={ctx?.bus}
            isProUnlocked={canMultiClass}
          />
        )}
      </Suspense>
    </main>
  );
}
