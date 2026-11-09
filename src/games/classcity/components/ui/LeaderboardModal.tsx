import { Download, Lock, Medal, Trophy, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import { t } from '../../../../platform/i18n';
import { selectLeaderboard } from '../../domain/selectors';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';
import { NativeDialog } from './NativeDialog';

export interface LeaderboardModalProps {
  useCases: ClassCityUseCases | null;
  canExportCsv: boolean;
}

function triggerTextDownload(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ranked leaderboard of student shops by `totalPoints` with Top 3 medals
 * and formula-safe CSV export gated by Pro entitlement (Rule 9).
 */
export function LeaderboardModal({
  useCases,
  canExportCsv,
}: LeaderboardModalProps) {
  const {
    activeModal,
    activeClassroomId,
    students,
    locale,
    setActiveModal,
    selectStudent,
    pushToast,
  } = useClassStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      activeClassroomId: s.activeClassroomId,
      students: s.students,
      locale: s.locale,
      setActiveModal: s.setActiveModal,
      selectStudent: s.selectStudent,
      pushToast: s.pushToast,
    }))
  );

  void locale;

  const isOpen = activeModal === 'leaderboard';
  const ranked = selectLeaderboard(students);

  const handleExportCsv = () => {
    const csv = useCases?.exportLeaderboardCsv();
    if (!csv) return;
    triggerTextDownload(
      `classcity-leaderboard-${activeClassroomId}.csv`,
      `\uFEFF${csv}`,
      'text/csv;charset=utf-8'
    );
    pushToast(t('leaderboard.exportCsvSuccess'), 'success');
  };

  return (
    <NativeDialog
      open={isOpen}
      onClose={() => setActiveModal('none')}
      labelledBy="leaderboard-modal-title"
      describedBy="leaderboard-modal-desc"
      dialogClassName="w-[min(94vw,48rem)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
            <Trophy className="size-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="leaderboard-modal-title"
              className="text-xl font-extrabold text-white text-balance sm:text-2xl"
            >
              {t('leaderboard.title')}
            </h2>
            <p
              id="leaderboard-modal-desc"
              className="mt-0.5 text-base text-[var(--ink-muted)] text-pretty"
            >
              {t('leaderboard.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-base font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
              canExportCsv
                ? 'bg-[var(--brand-primary)] text-white hover:brightness-110'
                : 'border border-amber-400/50 bg-[var(--surface-elevated)] text-amber-300 hover:bg-slate-700'
            )}
          >
            {canExportCsv ? (
              <Download className="size-4" aria-hidden="true" />
            ) : (
              <Lock className="size-4" aria-hidden="true" />
            )}
            <span>
              {canExportCsv
                ? t('leaderboard.exportCsv')
                : t('leaderboard.exportCsvLocked')}
            </span>
          </button>

          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setActiveModal('none')}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="py-10 text-center text-base text-[var(--ink-muted)]">
          {t('leaderboard.empty')}
        </p>
      ) : (
        <div className="mt-4 max-h-[62dvh] overflow-y-auto rounded-xl border border-slate-800">
          <table className="w-full border-collapse text-left text-base">
            <thead className="sticky top-0 bg-slate-900 text-sm font-bold text-[var(--ink-muted)]">
              <tr className="border-b border-slate-800">
                <th scope="col" className="px-3.5 py-3">
                  {t('leaderboard.colRank')}
                </th>
                <th scope="col" className="px-3 py-3">
                  {t('leaderboard.colCode')}
                </th>
                <th scope="col" className="px-3.5 py-3">
                  {t('leaderboard.colName')}
                </th>
                <th scope="col" className="hidden px-3 py-3 sm:table-cell">
                  {t('leaderboard.colBranch')}
                </th>
                <th scope="col" className="px-3 py-3 text-right">
                  {t('leaderboard.colLevel')}
                </th>
                <th scope="col" className="px-3.5 py-3 text-right">
                  {t('leaderboard.colPoints')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {ranked.map((stu, idx) => {
                const rank = idx + 1;
                const medalBadgeClass =
                  rank === 1
                    ? 'bg-amber-400 text-slate-950'
                    : rank === 2
                      ? 'bg-slate-200 text-slate-950'
                      : rank === 3
                        ? 'bg-orange-400 text-slate-950'
                        : 'bg-[var(--surface-elevated)] text-[var(--ink-muted)]';

                return (
                  <tr
                    key={stu.id}
                    className="bg-[var(--surface)] transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
                  >
                    <td className="px-3.5 py-2.5 tabular-nums">
                      <span
                        className={cn(
                          'inline-flex min-w-8 items-center justify-center gap-1 rounded-lg px-2 py-0.5 text-sm font-extrabold',
                          medalBadgeClass
                        )}
                      >
                        {rank <= 3 && (
                          <Medal className="size-3.5" aria-hidden="true" />
                        )}
                        {rank}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-bold text-teal-300 tabular-nums">
                      #{stu.studentCode}
                    </td>
                    <td className="max-w-56 px-3.5 py-2.5">
                      <button
                        type="button"
                        title={stu.name}
                        onClick={() => {
                          selectStudent(stu.id);
                          setActiveModal('none');
                        }}
                        className="max-w-full truncate rounded text-left font-bold text-white hover:text-teal-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                      >
                        {stu.name}
                      </button>
                    </td>
                    <td className="hidden px-3 py-2.5 text-sm text-[var(--ink-muted)] sm:table-cell">
                      {t(`sidebar.branch.${stu.shopBranch}`)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-amber-300 tabular-nums">
                      {t('sidebar.levelBadge', { level: stu.level })}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-extrabold text-white tabular-nums">
                      {stu.totalPoints}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </NativeDialog>
  );
}

export default LeaderboardModal;
