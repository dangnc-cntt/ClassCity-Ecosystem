import { Shuffle, Sparkles, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import type { SoundEffectsService } from '../../../../platform/audio/soundEffects';
import { t } from '../../../../platform/i18n';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';
import { NativeDialog } from './NativeDialog';

export interface CalloutModalProps {
  useCases: ClassCityUseCases | null;
  sound: SoundEffectsService;
}

/**
 * Ceremonial classroom Callout dialog (`<dialog>.showModal()`) anchored at the bottom
 * of the viewport so the zoomed 3D shop remains unobstructed above (`docs/design-plan.md`).
 * Title uses >= 32px typography for back-of-classroom projector readability.
 */
export function CalloutModal({ useCases, sound }: CalloutModalProps) {
  const {
    activeModal,
    calledStudent,
    calledHistory,
    useDoublePointsOnNextAward,
    locale,
    selectStudent,
    setUseDoublePointsOnNextAward,
  } = useClassStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      calledStudent:
        s.students.find((stu) => stu.id === s.calledStudentId) ?? null,
      calledHistory: s.calledHistory,
      useDoublePointsOnNextAward: s.useDoublePointsOnNextAward,
      locale: s.locale,
      selectStudent: s.selectStudent,
      setUseDoublePointsOnNextAward: s.setUseDoublePointsOnNextAward,
    }))
  );

  void locale;

  const isOpen = activeModal === 'callout' && calledStudent !== null;

  const handleClose = () => {
    useCases?.dismissCallout();
    selectStudent(null);
  };

  const handleAward = (delta: number, reason: string) => {
    if (!calledStudent || !useCases) return;
    sound.playPointAward(delta);
    void useCases.awardPoints({
      studentId: calledStudent.id,
      delta,
      reason,
    });
  };

  const unusedDoubleCount = calledStudent
    ? calledStudent.perks.filter((p) => p.kind === 'double_points' && !p.usedAt)
        .length
    : 0;

  const calledCount = calledStudent
    ? (calledHistory[String(calledStudent.lotNumber)] ?? 1)
    : 0;

  return (
    <NativeDialog
      open={isOpen}
      onClose={handleClose}
      labelledBy="callout-modal-title"
      describedBy="callout-modal-subtitle"
      dialogClassName="callout-dialog mt-auto mb-6 w-[min(94vw,46rem)]"
      panelClassName="border-2 border-[var(--brand-accent)] bg-[var(--surface)] p-6 text-center shadow-2xl"
    >
      {calledStudent && (
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-[var(--surface-elevated)] px-4 py-1.5 text-base font-extrabold tabular-nums">
            <span
              className="inline-flex size-6 items-center justify-center rounded-full text-sm font-extrabold text-slate-950"
              style={{ backgroundColor: calledStudent.shopColor }}
            >
              {calledStudent.studentCode}
            </span>
            <span className="text-amber-300">
              {t('callout.badge', {
                code: calledStudent.studentCode,
                level: calledStudent.level,
              })}
            </span>
          </div>

          <h2
            id="callout-modal-title"
            className="mt-3 text-[2rem] leading-tight font-extrabold text-white text-balance sm:text-4xl"
          >
            {t('callout.title', {
              code: calledStudent.studentCode,
              name: calledStudent.name,
            })}
          </h2>

          <p
            id="callout-modal-subtitle"
            className="mt-2 text-base font-semibold text-[var(--ink-muted)] tabular-nums text-pretty"
          >
            {t('callout.subtitle', {
              points: calledStudent.totalPoints,
              calledCount,
            })}
          </p>

          {unusedDoubleCount > 0 && (
            <div className="mt-4">
              <button
                type="button"
                aria-pressed={useDoublePointsOnNextAward}
                onClick={() =>
                  setUseDoublePointsOnNextAward(!useDoublePointsOnNextAward)
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
                  useDoublePointsOnNextAward
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-amber-400/60 bg-[var(--surface-elevated)] text-amber-300 hover:bg-slate-700'
                )}
              >
                <Sparkles className="size-5" aria-hidden="true" />
                <span>
                  {useDoublePointsOnNextAward
                    ? t('callout.doublePerkActive')
                    : t('callout.useDoublePerk', { count: unusedDoubleCount })}
                </span>
              </button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => handleAward(1, 'callout_plus_1')}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-base font-extrabold text-white transition-transform duration-150 hover:bg-emerald-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              {t('city.awardPlus1')}
            </button>
            <button
              type="button"
              onClick={() => handleAward(2, 'callout_plus_2')}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-base font-extrabold text-white transition-transform duration-150 hover:bg-teal-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              {t('city.awardPlus2')}
            </button>
            <button
              type="button"
              onClick={() => handleAward(5, 'callout_plus_5')}
              className="rounded-xl bg-[var(--brand-accent)] px-4 py-2.5 text-base font-extrabold text-slate-950 transition-transform duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              {t('city.awardPlus5')}
            </button>
            <button
              type="button"
              onClick={() => handleAward(-1, 'callout_minus_1')}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-base font-extrabold text-white transition-transform duration-150 hover:bg-rose-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            >
              {t('city.awardMinus1')}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => useCases?.startAutoDrive()}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/50 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-amber-300 transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <Shuffle className="size-4" aria-hidden="true" />
              <span>{t('callout.callAnother')}</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-base font-bold text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              <X className="size-4" aria-hidden="true" />
              <span>{t('callout.close')}</span>
            </button>
          </div>
        </div>
      )}
    </NativeDialog>
  );
}
