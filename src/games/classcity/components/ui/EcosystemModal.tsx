import { useEffect, useState } from 'react';
import { Crown, Network, Radio, Send, Sparkles, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import type { EcosystemEventBus } from '../../../../platform/eventBus';
import { t } from '../../../../platform/i18n';
import type { EcoEvent, EcoEventType } from '../../../../platform/types/events';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';
import { NativeDialog } from './NativeDialog';

const WATCHED_EVENTS: readonly EcoEventType[] = [
  'LEDGER:POINTS_AWARDED',
  'PROFILE:AVATAR_CHANGED',
  'ROSTER:STUDENT_UPDATED',
  'CLASSROOM:CHANGED',
  'GAME:STUDENT_CALLED',
  'AUDIO:MUTE_CHANGED',
];

export interface EcosystemModalProps {
  useCases: ClassCityUseCases | null;
  bus?: EcosystemEventBus;
  isProUnlocked: boolean;
}

/**
 * Multi-game Ecosystem Bridge simulator & live `EcoEvent` stream viewer,
 * plus the Pro entitlement upgrade dialog (`activeModal === 'upgrade_pro'`) (Rule 9 & R7).
 */
export function EcosystemModal({
  useCases,
  bus,
  isProUnlocked,
}: EcosystemModalProps) {
  const { activeModal, students, locale, setActiveModal, pushToast } =
    useClassStore(
      useShallow((s) => ({
        activeModal: s.activeModal,
        students: s.students,
        locale: s.locale,
        setActiveModal: s.setActiveModal,
        pushToast: s.pushToast,
      }))
    );

  void locale;

  const isEcoOpen = activeModal === 'ecosystem';
  const isUpgradeOpen = activeModal === 'upgrade_pro';

  const [sourceGame, setSourceGame] = useState<'classarena' | 'classfarm'>(
    'classarena'
  );
  const [targetStudentId, setTargetStudentId] = useState('');
  const [deltaPoints, setDeltaPoints] = useState(5);
  const [eventLogs, setEventLogs] = useState<EcoEvent[]>([]);

  useEffect(() => {
    if (!targetStudentId && students[0]) {
      setTargetStudentId(students[0].id);
    } else if (
      targetStudentId &&
      !students.some((s) => s.id === targetStudentId)
    ) {
      setTargetStudentId(students[0]?.id ?? '');
    }
  }, [students, targetStudentId]);

  // Subscribe to all EcosystemEventBus events for real-time log display (cleaned up on unmount per Rule R5)
  useEffect(() => {
    if (!bus) return;
    const unsubs = WATCHED_EVENTS.map((evtType) =>
      bus.on(evtType, (evt) => {
        setEventLogs((prev) => [evt, ...prev].slice(0, 25));
      })
    );
    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [bus]);

  const handleToggleTier = async () => {
    if (!useCases) return;
    const nextTier = isProUnlocked ? 'free' : 'pro';
    await useCases.setSubscriptionTier(nextTier);
    pushToast(
      t('ecosystem.tierSwitchedToast', { tier: nextTier.toUpperCase() }),
      'success'
    );
  };

  const handleSimulateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useCases || !targetStudentId) return;
    await useCases.simulateExternalGameAward({
      gameId: sourceGame,
      studentId: targetStudentId,
      delta: deltaPoints,
      reason: `${sourceGame}:victory_bonus`,
    });
    const gameName =
      sourceGame === 'classarena'
        ? t('game.classarena.name')
        : t('game.classfarm.name');
    pushToast(
      t('ecosystem.simSentToast', { delta: deltaPoints, game: gameName }),
      'success'
    );
  };

  return (
    <>
      {/* Main Ecosystem Simulator & Event Log Modal */}
      <NativeDialog
        open={isEcoOpen}
        onClose={() => setActiveModal('none')}
        labelledBy="ecosystem-modal-title"
        describedBy="ecosystem-modal-subtitle"
        dialogClassName="w-[min(94vw,44rem)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white">
              <Network className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="ecosystem-modal-title"
                className="text-xl font-extrabold text-white text-balance sm:text-2xl"
              >
                {t('ecosystem.title')}
              </h2>
              <p
                id="ecosystem-modal-subtitle"
                className="mt-0.5 text-base text-[var(--ink-muted)] text-pretty"
              >
                {t('ecosystem.subtitle')}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setActiveModal('none')}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Subscription Tier Demo Switcher */}
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {t('ecosystem.tierSection')}
              </h3>
              <p className="mt-0.5 text-sm font-semibold text-amber-300">
                {isProUnlocked
                  ? t('ecosystem.currentTierPro')
                  : t('ecosystem.currentTierFree')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleToggleTier()}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-base font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <Crown className="size-4" aria-hidden="true" />
              <span>
                {isProUnlocked
                  ? t('ecosystem.switchToFree')
                  : t('ecosystem.switchToPro')}
              </span>
            </button>
          </section>

          {/* Cross-Game Point Award Simulator */}
          <form
            onSubmit={(e) => void handleSimulateAward(e)}
            className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4"
          >
            <h3 className="text-base font-bold text-white">
              {t('ecosystem.simSection')}
            </h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="eco-source-game"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('ecosystem.sourceGameLabel')}
                </label>
                <select
                  id="eco-source-game"
                  value={sourceGame}
                  onChange={(e) =>
                    setSourceGame(e.target.value as 'classarena' | 'classfarm')
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  <option value="classarena">{t('game.classarena.name')}</option>
                  <option value="classfarm">{t('game.classfarm.name')}</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="eco-target-student"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('ecosystem.targetStudentLabel')}
                </label>
                <select
                  id="eco-target-student"
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.studentCode} – {s.name} (Lv.{s.level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="eco-delta-points"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('ecosystem.deltaLabel')}
                </label>
                <select
                  id="eco-delta-points"
                  value={deltaPoints}
                  onChange={(e) => setDeltaPoints(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-white tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {[1, 2, 5, 10].map((val) => (
                    <option key={val} value={val}>
                      +{val}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={!targetStudentId}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-base font-bold text-white hover:brightness-110 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                <Send className="size-4" aria-hidden="true" />
                <span>{t('ecosystem.sendAwardBtn')}</span>
              </button>
            </div>
          </form>

          {/* Real-time EcoEvent Log */}
          <section className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4">
            <h3 className="inline-flex items-center gap-2 text-base font-bold text-white">
              <Radio className="size-4 text-emerald-400" aria-hidden="true" />
              <span>{t('ecosystem.eventLogTitle')}</span>
            </h3>
            {eventLogs.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                {t('ecosystem.eventLogEmpty')}
              </p>
            ) : (
              <ul className="mt-2.5 max-h-44 space-y-1.5 overflow-y-auto text-xs tabular-nums">
                {eventLogs.map((evt) => (
                  <li
                    key={evt.eventId}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-slate-200"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-teal-300">
                        {evt.type}
                      </span>
                      <span className="text-slate-400">
                        [{evt.source.gameId}] •{' '}
                        {evt.occurredAt.slice(11, 19)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </NativeDialog>

      {/* Upgrade to Pro Prompt Dialog */}
      <NativeDialog
        open={isUpgradeOpen}
        onClose={() => setActiveModal('none')}
        labelledBy="upgrade-pro-title"
        describedBy="upgrade-pro-desc"
        dialogClassName="w-[min(92vw,30rem)]"
        panelClassName="border-amber-400 text-center"
      >
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
          <Sparkles className="size-6" aria-hidden="true" />
        </div>
        <h2
          id="upgrade-pro-title"
          className="mt-3 text-2xl font-extrabold text-white text-balance"
        >
          {t('upgrade.title')}
        </h2>
        <p
          id="upgrade-pro-desc"
          className="mt-2 text-base text-[var(--ink-muted)] text-pretty"
        >
          {t('upgrade.desc')}
        </p>

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveModal('none')}
            className="rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={() => {
              void useCases?.setSubscriptionTier('pro').then(() => {
                pushToast(
                  t('ecosystem.tierSwitchedToast', { tier: 'PRO' }),
                  'success'
                );
                setActiveModal('none');
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-5 py-2 text-base font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            <Crown className="size-4" aria-hidden="true" />
            <span>{t('upgrade.activateDemoPro')}</span>
          </button>
        </div>
      </NativeDialog>
    </>
  );
}

export default EcosystemModal;
