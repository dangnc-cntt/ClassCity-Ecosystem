import {
  Ambulance,
  ArrowLeft,
  Car,
  CloudRain,
  FolderSync,
  Lock,
  Megaphone,
  Network,
  Orbit,
  Rainbow,
  Settings,
  Shuffle,
  Sun,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import type { SoundEffectsService } from '../../../../platform/audio/soundEffects';
import { t } from '../../../../platform/i18n';
import { calculateWonderProgress } from '../../domain/levels';
import type { VehicleKind, WeatherMode } from '../../state/types';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';

export interface TopToolbarProps {
  useCases: ClassCityUseCases | null;
  sound: SoundEffectsService;
  canMultiClass: boolean;
}

/**
 * Top HUD toolbar over the 3D city canvas (Rule 9, `docs/design-plan.md`).
 * Opaque high-contrast surface (`--surface`), zero `backdrop-filter`, clean single-row balance.
 */
export function TopToolbar({
  useCases,
  sound,
  canMultiClass,
}: TopToolbarProps) {
  const {
    brandName,
    classrooms,
    activeClassroomId,
    studentsCount,
    wonderProgress,
    pointsPerLevel,
    vehicleState,
    vehicleKind,
    weatherMode,
    nearestManualLotId,
    muted,
    locale,
    setActiveModal,
  } = useClassStore(
    useShallow((s) => ({
      brandName: s.brand.name,
      classrooms: s.classrooms,
      activeClassroomId: s.activeClassroomId,
      studentsCount: s.students.length,
      wonderProgress: s.wonderProgress,
      pointsPerLevel: s.pointsPerLevel,
      vehicleState: s.vehicleState,
      vehicleKind: s.vehicleKind,
      weatherMode: s.weatherMode,
      nearestManualLotId: s.nearestManualLotId,
      muted: s.muted,
      locale: s.locale,
      setActiveModal: s.setActiveModal,
    }))
  );

  // Subscribe `locale` so labels re-render immediately on language switch
  void locale;

  const wonderInfo = calculateWonderProgress(
    wonderProgress,
    Math.max(1, studentsCount),
    pointsPerLevel
  );

  const isAutoDriving =
    vehicleState === 'accelerating' ||
    vehicleState === 'cruising' ||
    vehicleState === 'decelerating';

  const handleToggleMute = () => {
    const nextMuted = !muted;
    sound.setMuted(nextMuted);
    void useCases?.updateSettings({ muted: nextMuted });
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 p-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
      {/* Left Cluster: Hub, Brand & Classroom, Wonder Pill, Primary Auto-Drive CTA */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/90 bg-[var(--surface)] px-2.5 py-2 shadow-xl">
        <button
          type="button"
          onClick={() => useCases?.navigateToHub()}
          aria-label={t('toolbar.backToHub')}
          title={t('toolbar.backToHub')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-2.5 py-1.5 text-sm font-bold text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ArrowLeft className="size-4 shrink-0 text-teal-300" aria-hidden="true" />
          <span className="hidden sm:inline">{t('toolbar.backToHub')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden text-lg font-extrabold text-[var(--ink-primary)] xl:inline">
            {brandName}
          </span>
          <div className="relative flex items-center">
            <label htmlFor="toolbar-classroom-select" className="sr-only">
              {t('toolbar.selectClassroom')}
            </label>
            <select
              id="toolbar-classroom-select"
              value={activeClassroomId}
              onChange={(e) => {
                void useCases?.switchClassroom(e.target.value);
              }}
              className="rounded-xl bg-[var(--surface-elevated)] py-1.5 pr-7 pl-2.5 text-sm font-bold text-[var(--ink-primary)] tabular-nums transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {classrooms.map((cls) => {
                const isLocked =
                  !canMultiClass && cls.id !== activeClassroomId;
                return (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                    {isLocked ? t('toolbar.proLockedSuffix') : ''}
                  </option>
                );
              })}
            </select>
            {!canMultiClass && classrooms.length > 1 && (
              <Lock
                className="pointer-events-none absolute right-2 size-3.5 text-amber-400"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="hidden h-6 w-px bg-slate-700 md:block" aria-hidden="true" />

        {/* Compact Class Wonder Progress Pill */}
        <div className="flex flex-col justify-center rounded-xl bg-[var(--surface-elevated)] px-2.5 py-1">
          <span className="text-xs font-extrabold text-amber-300 tabular-nums">
            {t('city.wonderProgress', {
              percent: wonderInfo.percent,
              stage: wonderInfo.stage,
            })}
          </span>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={wonderInfo.percent}
            aria-label={t('city.wonderAriaLabel', {
              percent: wonderInfo.percent,
            })}
            className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-slate-900"
          >
            <div
              className="h-full w-full origin-left bg-[var(--brand-accent)] transition-transform duration-200 ease-out"
              style={{ transform: `scaleX(${wonderInfo.ratio})` }}
            />
          </div>
        </div>

        {/* Primary Classroom Action: Auto-Drive Callout */}
        <button
          type="button"
          disabled={isAutoDriving || studentsCount === 0}
          onClick={() => useCases?.startAutoDrive()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-accent)] px-3.5 py-2 text-sm font-extrabold text-slate-950 shadow-sm transition-transform duration-150 hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <Shuffle className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {isAutoDriving ? t('toolbar.autoDriving') : t('toolbar.autoDrive')}
          </span>
        </button>

        {/* Manual Nearest Lot Call Button */}
        {nearestManualLotId !== null && !isAutoDriving && (
          <button
            type="button"
            onClick={() => void useCases?.callStudentByLot(nearestManualLotId)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-sm font-bold text-white shadow-sm transition-transform duration-150 hover:brightness-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            <Megaphone className="size-4 shrink-0" aria-hidden="true" />
            <span className="tabular-nums">
              {t('toolbar.manualCallLot', { code: nearestManualLotId })}
            </span>
          </button>
        )}
      </div>

      {/* Right Cluster: Segmented Vehicle/Weather Controls + Clean Utility Buttons */}
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-700/90 bg-[var(--surface)] px-2.5 py-1.5 shadow-xl">
        {/* Vehicle Kind Switcher */}
        <div
          role="group"
          aria-label={t('toolbar.vehicleGroup')}
          className="flex items-center gap-0.5 rounded-xl bg-[var(--surface-elevated)] p-1"
        >
          {(
            [
              { kind: 'car', Icon: Car },
              { kind: 'ambulance', Icon: Ambulance },
              { kind: 'ufo', Icon: Orbit },
            ] as const
          ).map(({ kind, Icon }: { kind: VehicleKind; Icon: typeof Car }) => {
            const active = vehicleKind === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-pressed={active}
                aria-label={t(`city.vehicle.${kind}`)}
                title={t(`city.vehicle.${kind}`)}
                onClick={() => void useCases?.setVehicleKind(kind)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                  active
                    ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                    : 'text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden 2xl:inline">
                  {t(`city.vehicle.${kind}`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Weather Switcher */}
        <div
          role="group"
          aria-label={t('toolbar.weatherGroup')}
          className="flex items-center gap-0.5 rounded-xl bg-[var(--surface-elevated)] p-1"
        >
          {(
            [
              { mode: 'sunny', Icon: Sun },
              { mode: 'rainbow', Icon: Rainbow },
              { mode: 'rainy', Icon: CloudRain },
            ] as const
          ).map(({ mode, Icon }: { mode: WeatherMode; Icon: typeof Sun }) => {
            const active = weatherMode === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                aria-label={t(`city.weather.${mode}`)}
                title={t(`city.weather.${mode}`)}
                onClick={() => void useCases?.setWeatherMode(mode)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400',
                  active
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white'
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="hidden 2xl:inline">
                  {t(`city.weather.${mode}`)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden h-6 w-px bg-slate-700 sm:block" aria-hidden="true" />

        {/* Mute Toggle */}
        <button
          type="button"
          aria-pressed={muted}
          aria-label={muted ? t('toolbar.muteOn') : t('toolbar.muteOff')}
          title={muted ? t('toolbar.muteOn') : t('toolbar.muteOff')}
          onClick={handleToggleMute}
          className={cn(
            'inline-flex size-9 items-center justify-center rounded-xl transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
            muted
              ? 'bg-rose-950 text-rose-300 hover:bg-rose-900'
              : 'bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:bg-slate-700'
          )}
        >
          {muted ? (
            <VolumeX className="size-4" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4" aria-hidden="true" />
          )}
        </button>

        {/* Leaderboard */}
        <button
          type="button"
          onClick={() => setActiveModal('leaderboard')}
          aria-label={t('toolbar.leaderboard')}
          title={t('toolbar.leaderboard')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-2.5 py-2 text-sm font-bold text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <Trophy className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="hidden 2xl:inline">{t('toolbar.leaderboard')}</span>
        </button>

        {/* Import / Export */}
        <button
          type="button"
          onClick={() => setActiveModal('import_export')}
          aria-label={t('toolbar.importExport')}
          title={t('toolbar.importExport')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-2.5 py-2 text-sm font-bold text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <FolderSync className="size-4 shrink-0 text-teal-300" aria-hidden="true" />
          <span className="hidden 2xl:inline">{t('toolbar.importExport')}</span>
        </button>

        {/* Ecosystem Bridge */}
        <button
          type="button"
          onClick={() => setActiveModal('ecosystem')}
          aria-label={t('toolbar.ecosystem')}
          title={t('toolbar.ecosystem')}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-elevated)] px-2.5 py-2 text-sm font-bold text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <Network className="size-4 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="hidden 2xl:inline">{t('toolbar.ecosystem')}</span>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setActiveModal('settings')}
          aria-label={t('toolbar.settings')}
          title={t('toolbar.settings')}
          className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <Settings className="size-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
