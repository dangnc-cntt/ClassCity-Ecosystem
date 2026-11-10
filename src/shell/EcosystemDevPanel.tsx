import { useEffect, useState } from 'react';
import { Crown, FlaskConical, Radio, Send, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { t } from '../platform/i18n';
import type { EcoEvent, EcoEventType } from '../platform/types/events';
import type { GameContext } from '../platform/types/manifest';
import type { StudentCore } from '../platform/types/models';

const WATCHED_EVENTS: readonly EcoEventType[] = [
  'LEDGER:POINTS_AWARDED',
  'PROFILE:AVATAR_CHANGED',
  'ROSTER:STUDENT_UPDATED',
  'CLASSROOM:CHANGED',
  'GAME:STUDENT_CALLED',
  'HUB:NAVIGATE',
  'AUDIO:MUTE_CHANGED',
];

function makeDevUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface EcosystemDevPanelProps {
  ctx: GameContext;
  localeTick?: number;
}

/**
 * Collapsible Shell-level developer panel to simulate sibling games (`ClassArena`, `ClassFarm`)
 * awarding points over `EcosystemEventBus` and to toggle Free <-> Pro entitlements live (Rule 9 & GĐ7).
 */
export function EcosystemDevPanel({ ctx, localeTick }: EcosystemDevPanelProps) {
  void localeTick;

  const isDevPanelEnabled =
    Boolean(import.meta.env?.DEV) ||
    typeof window === 'undefined' ||
    new URLSearchParams(window.location.search).get('dev') === '1';

  const [expanded, setExpanded] = useState(false);
  const [isPro, setIsPro] = useState(() =>
    ctx.entitlements.has('classcity.multi_class')
  );
  const [activeClassroomId, setActiveClassroomId] = useState(ctx.classroomId);
  const [students, setStudents] = useState<StudentCore[]>([]);
  const [targetStudentId, setTargetStudentId] = useState('');
  const [sourceGame, setSourceGame] = useState<'classarena' | 'classfarm'>(
    'classarena'
  );
  const [deltaPoints, setDeltaPoints] = useState(5);
  const [events, setEvents] = useState<EcoEvent[]>([]);

  // Sync activeClassroomId when prop changes
  useEffect(() => {
    setActiveClassroomId(ctx.classroomId);
  }, [ctx.classroomId]);

  // Subscribe to entitlement changes (Rule R5 & R7)
  useEffect(() => {
    setIsPro(ctx.entitlements.has('classcity.multi_class'));
    return ctx.entitlements.subscribe(() => {
      setIsPro(ctx.entitlements.has('classcity.multi_class'));
    });
  }, [ctx.entitlements]);

  // Load roster for the active classroom whenever panel opens or classroom/roster changes
  useEffect(() => {
    let cancelled = false;
    const refreshRoster = async (classId: string) => {
      const list = await ctx.repos.students.listByClassroom(classId);
      if (cancelled) return;
      setStudents(list);
      setTargetStudentId((prev) =>
        list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? '')
      );
    };

    void refreshRoster(activeClassroomId);

    const unsubClass = ctx.bus.on('CLASSROOM:CHANGED', (evt) => {
      setActiveClassroomId(evt.payload.classroomId);
      void refreshRoster(evt.payload.classroomId);
    });

    const unsubRoster = ctx.bus.on('ROSTER:STUDENT_UPDATED', () => {
      void refreshRoster(activeClassroomId);
    });

    const unsubAward = ctx.bus.on('LEDGER:POINTS_AWARDED', (evt) => {
      if (evt.payload.tx.classroomId === activeClassroomId) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === evt.payload.tx.studentId
              ? { ...s, totalPoints: evt.payload.totalPoints }
              : s
          )
        );
      }
    });

    return () => {
      cancelled = true;
      unsubClass();
      unsubRoster();
      unsubAward();
    };
  }, [ctx.repos, ctx.bus, activeClassroomId]);

  // Record live EcoEvent stream (Rule R5)
  useEffect(() => {
    const unsubs = WATCHED_EVENTS.map((evtType) =>
      ctx.bus.on(evtType, (evt) => {
        setEvents((prev) => [evt, ...prev].slice(0, 15));
      })
    );
    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [ctx.bus]);

  const handleToggleTier = async () => {
    const nextTier = isPro ? 'free' : 'pro';
    ctx.entitlements.setTier(nextTier);
    await ctx.repos.teachers.updateProfile({ tier: nextTier });
    await ctx.repos.settings.patchSettings({ devTier: nextTier });
  };

  const handleSimulateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId) return;

    const res = await ctx.repos.ledger.award({
      studentId: targetStudentId,
      classroomId: activeClassroomId,
      gameId: sourceGame,
      delta: deltaPoints,
      reason: `${sourceGame}:dev_panel`,
      idempotencyKey: makeDevUuid(),
      actorUserId: ctx.user.userId,
    });

    ctx.bus.publish(
      'LEDGER:POINTS_AWARDED',
      {
        tx: res.tx,
        totalPoints: res.totalPoints,
      },
      {
        gameId: sourceGame,
        classroomId: activeClassroomId,
      }
    );
  };

  if (!isDevPanelEnabled) {
    return null;
  }

  if (!expanded) {
    return (
      <div className="fixed bottom-3 left-3 z-30 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
        <button
          type="button"
          aria-expanded={false}
          aria-controls="shell-ecosystem-dev-panel"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[var(--surface)] px-3.5 py-2 text-sm font-bold text-[var(--ink-primary)] shadow-lg transition-colors duration-150 hover:border-sky-400 hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <FlaskConical className="size-4 text-sky-400" aria-hidden="true" />
          <span>{t('dev.toggleBtn')}</span>
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-xs font-extrabold tabular-nums',
              isPro
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-700 text-slate-200'
            )}
          >
            {isPro ? 'PRO' : 'FREE'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <section
      id="shell-ecosystem-dev-panel"
      aria-label={t('dev.panelTitle')}
      className="fixed bottom-3 left-3 z-30 w-[min(92vw,23rem)] rounded-2xl border border-slate-700 bg-[var(--surface)] p-4 text-[var(--ink-primary)] shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-sky-400" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-white">
            {t('dev.panelTitle')}
          </h2>
        </div>
        <button
          type="button"
          aria-label={t('dev.closeAria')}
          onClick={() => setExpanded(false)}
          className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Live Free <-> Pro Switch */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-[var(--surface-elevated)] px-3 py-2">
        <span className="text-sm font-bold text-[var(--ink-muted)]">
          {t('dev.tierLabel')}{' '}
          <strong className="text-amber-300">{isPro ? 'PRO' : 'FREE'}</strong>
        </span>
        <button
          type="button"
          onClick={() => void handleToggleTier()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-accent)] px-3 py-1 text-sm font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <Crown className="size-3.5" aria-hidden="true" />
          <span>
            {isPro ? t('dev.tierSwitchToFree') : t('dev.tierSwitchToPro')}
          </span>
        </button>
      </div>

      {/* Simulate External Game Award */}
      <form
        onSubmit={(e) => void handleSimulateAward(e)}
        className="mt-3 space-y-2.5 rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-3"
      >
        <p className="text-sm font-bold text-white">{t('dev.simTitle')}</p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="dev-source-game"
              className="block text-xs font-semibold text-[var(--ink-muted)]"
            >
              {t('dev.gameLabel')}
            </label>
            <select
              id="dev-source-game"
              value={sourceGame}
              onChange={(e) =>
                setSourceGame(e.target.value as 'classarena' | 'classfarm')
              }
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              <option value="classarena">ClassArena</option>
              <option value="classfarm">ClassFarm</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="dev-delta-select"
              className="block text-xs font-semibold text-[var(--ink-muted)]"
            >
              {t('dev.pointsLabel')}
            </label>
            <select
              id="dev-delta-select"
              value={deltaPoints}
              onChange={(e) => setDeltaPoints(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm font-bold text-white tabular-nums focus-visible:outline-2 focus-visible:outline-sky-400"
            >
              {[1, 3, 5, 10].map((v) => (
                <option key={v} value={v}>
                  +{v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="dev-student-select"
            className="block text-xs font-semibold text-[var(--ink-muted)]"
          >
            {t('dev.studentLabel')}
          </label>
          <select
            id="dev-student-select"
            value={targetStudentId}
            onChange={(e) => setTargetStudentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm font-bold text-white tabular-nums focus-visible:outline-2 focus-visible:outline-sky-400"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.studentCode} – {s.name} ({s.totalPoints}p)
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={!targetStudentId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-sm font-extrabold text-white hover:brightness-110 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <Send className="size-4" aria-hidden="true" />
          <span>{t('dev.awardBtn')}</span>
        </button>
      </form>

      {/* Recent Bus Events */}
      <div className="mt-3">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--ink-muted)] tabular-nums">
          <Radio className="size-3.5 text-emerald-400" aria-hidden="true" />
          <span>{t('dev.recentEvents', { count: events.length })}</span>
        </p>
        {events.length === 0 ? (
          <p className="mt-1 text-xs text-slate-400">{t('dev.noEvents')}</p>
        ) : (
          <ul className="mt-1.5 max-h-28 space-y-1 overflow-y-auto text-xs tabular-nums">
            {events.map((evt) => (
              <li
                key={evt.eventId}
                className="flex items-center justify-between rounded bg-slate-900 px-2 py-1 text-slate-300"
              >
                <span className="truncate font-bold text-teal-300">
                  {evt.type}
                </span>
                <span className="shrink-0 text-slate-400">
                  {evt.source.gameId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
