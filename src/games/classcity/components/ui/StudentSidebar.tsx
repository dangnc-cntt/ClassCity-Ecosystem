import { useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Megaphone,
  Search,
  Sparkles,
  Store,
  UserPlus,
  X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import type { SoundEffectsService } from '../../../../platform/audio/soundEffects';
import { t } from '../../../../platform/i18n';
import { PASTEL_SHOP_COLORS } from '../../config/assetsRegistry';
import { progressToNext } from '../../domain/levels';
import { filterStudents } from '../../domain/selectors';
import type { ShopBranch } from '../../state/types';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';

const AVATAR_OPTIONS = [
  'avatar_knight',
  'avatar_mage',
  'avatar_astronaut',
  'avatar_dino',
  'avatar_cat',
] as const;

const BRANCH_OPTIONS: readonly ShopBranch[] = [
  'bakery',
  'cafe',
  'bookstore',
  'petshop',
  'gamecenter',
];

type LevelRangeKey = 'all' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';

const LEVEL_RANGES: Record<LevelRangeKey, { min: number; max: number }> = {
  all: { min: 1, max: 20 },
  tier1: { min: 1, max: 4 },
  tier2: { min: 5, max: 9 },
  tier3: { min: 10, max: 14 },
  tier4: { min: 15, max: 19 },
  tier5: { min: 20, max: 20 },
};

export interface StudentSidebarProps {
  useCases: ClassCityUseCases | null;
  sound: SoundEffectsService;
}

/**
 * Collapsible right HUD panel for student search/filtering, point awarding,
 * perk usage, and instant 3D shop/avatar customization (Rule 9).
 */
export function StudentSidebar({ useCases, sound }: StudentSidebarProps) {
  const {
    students,
    selectedStudentId,
    searchQuery,
    branchFilter,
    pointsPerLevel,
    sidebarCollapsed,
    useDoublePointsOnNextAward,
    locale,
    selectStudent,
    setSearchQuery,
    setBranchFilter,
    setSidebarCollapsed,
    setActiveModal,
    setUseDoublePointsOnNextAward,
  } = useClassStore(
    useShallow((s) => ({
      students: s.students,
      selectedStudentId: s.selectedStudentId,
      searchQuery: s.searchQuery,
      branchFilter: s.branchFilter,
      pointsPerLevel: s.pointsPerLevel,
      sidebarCollapsed: s.sidebarCollapsed,
      useDoublePointsOnNextAward: s.useDoublePointsOnNextAward,
      locale: s.locale,
      selectStudent: s.selectStudent,
      setSearchQuery: s.setSearchQuery,
      setBranchFilter: s.setBranchFilter,
      setSidebarCollapsed: s.setSidebarCollapsed,
      setActiveModal: s.setActiveModal,
      setUseDoublePointsOnNextAward: s.setUseDoublePointsOnNextAward,
    }))
  );

  void locale;

  const [levelRange, setLevelRange] = useState<LevelRangeKey>('all');
  const [hexDraft, setHexDraft] = useState('');
  const [hexInvalid, setHexInvalid] = useState(false);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ?? null;

  useEffect(() => {
    if (selectedStudent) {
      setHexDraft(selectedStudent.shopColor);
      setHexInvalid(false);
    }
  }, [selectedStudent]);

  const rangeBounds = LEVEL_RANGES[levelRange];
  const filteredStudents = filterStudents(students, {
    query: searchQuery,
    branch: branchFilter,
    minLevel: rangeBounds.min,
    maxLevel: rangeBounds.max,
  });

  const handleAward = (studentId: string, delta: number, reason: string) => {
    if (!useCases) return;
    sound.playPointAward(delta);
    void useCases.awardPoints({ studentId, delta, reason });
  };

  const handleApplyHex = async () => {
    if (!selectedStudent || !useCases) return;
    const cleaned = hexDraft.trim();
    const ok = await useCases.changeShopColor(selectedStudent.id, cleaned);
    setHexInvalid(!ok);
  };

  const progress = selectedStudent
    ? progressToNext(selectedStudent.totalPoints, pointsPerLevel)
    : null;

  const unusedPerks = selectedStudent
    ? selectedStudent.perks.filter((p) => !p.usedAt)
    : [];
  const unusedDoubleCount = unusedPerks.filter(
    (p) => p.kind === 'double_points'
  ).length;

  return (
    <>
      {/* Expand button when sidebar is collapsed */}
      {sidebarCollapsed && (
        <button
          type="button"
          aria-expanded={false}
          aria-controls="student-sidebar-panel"
          onClick={() => setSidebarCollapsed(false)}
          className="fixed top-24 right-3 z-20 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-[var(--surface)] px-3.5 py-2.5 text-base font-bold text-[var(--ink-primary)] shadow-lg transition-colors duration-150 hover:border-teal-400 hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
        >
          <ChevronLeft className="size-5 text-teal-400" aria-hidden="true" />
          <span className="tabular-nums">
            {t('sidebar.expand', { count: students.length })}
          </span>
        </button>
      )}

      {/* Main Sidebar Panel (animates transform only per fixing-motion-performance) */}
      <aside
        id="student-sidebar-panel"
        aria-label={t('sidebar.title')}
        className={cn(
          'fixed top-24 right-3 bottom-3 z-20 flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[var(--surface)] shadow-xl transition-transform duration-200 ease-out pr-[env(safe-area-inset-right)]',
          sidebarCollapsed
            ? 'pointer-events-none translate-x-[calc(100%+1.5rem)]'
            : 'translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Store className="size-5 text-teal-400" aria-hidden="true" />
            <h2 className="text-xl font-extrabold text-[var(--ink-primary)] text-balance">
              {t('sidebar.title')}
            </h2>
            <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-0.5 text-sm font-bold text-teal-300 tabular-nums">
              {students.length}
            </span>
          </div>
          <button
            type="button"
            aria-expanded={!sidebarCollapsed}
            aria-controls="student-sidebar-panel"
            aria-label={t('sidebar.collapse')}
            title={t('sidebar.collapse')}
            onClick={() => setSidebarCollapsed(true)}
            className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-primary)] transition-colors duration-150 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Search & Filters */}
        {students.length > 0 && (
          <div className="space-y-2 border-b border-slate-800 p-3">
            <div className="relative">
              <label htmlFor="sidebar-student-search" className="sr-only">
                {t('sidebar.searchAria')}
              </label>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--ink-muted)]"
                aria-hidden="true"
              />
              <input
                id="sidebar-student-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('sidebar.searchPlaceholder')}
                className="w-full rounded-xl border border-slate-700 bg-[var(--surface-elevated)] py-2 pr-3 pl-9 text-base text-[var(--ink-primary)] placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="sidebar-branch-filter" className="sr-only">
                  {t('sidebar.filterBranchAria')}
                </label>
                <select
                  id="sidebar-branch-filter"
                  value={branchFilter}
                  onChange={(e) =>
                    setBranchFilter(e.target.value as ShopBranch | 'all')
                  }
                  className="w-full rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-2.5 py-1.5 text-sm font-semibold text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  <option value="all">{t('sidebar.branch.all')}</option>
                  {BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {t(`sidebar.branch.${b}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sidebar-level-filter" className="sr-only">
                  {t('sidebar.filterLevelAria')}
                </label>
                <select
                  id="sidebar-level-filter"
                  value={levelRange}
                  onChange={(e) =>
                    setLevelRange(e.target.value as LevelRangeKey)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-2.5 py-1.5 text-sm font-semibold text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {(
                    ['all', 'tier1', 'tier2', 'tier3', 'tier4', 'tier5'] as const
                  ).map((rk) => (
                    <option key={rk} value={rk}>
                      {t(`sidebar.level.${rk}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Roster List */}
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
          {students.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[var(--surface-elevated)] p-6 text-center">
              <UserPlus className="size-10 text-teal-400" aria-hidden="true" />
              <h3 className="mt-3 text-lg font-bold text-[var(--ink-primary)] text-balance">
                {t('sidebar.emptyClassroomTitle')}
              </h3>
              <p className="mt-1.5 text-base text-[var(--ink-muted)] text-pretty">
                {t('sidebar.emptyClassroomDesc')}
              </p>
              <button
                type="button"
                onClick={() => setActiveModal('import_export')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2.5 text-base font-bold text-white transition-colors duration-150 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                <UserPlus className="size-4" aria-hidden="true" />
                <span>{t('sidebar.emptyClassroomCta')}</span>
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4 text-center">
              <p className="text-base text-[var(--ink-muted)] text-pretty">
                {t('sidebar.noFilterMatch')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setBranchFilter('all');
                  setLevelRange('all');
                }}
                className="mt-3 rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-1.5 text-sm font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              >
                {t('sidebar.clearFilter')}
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filteredStudents.map((stu) => {
                const isSelected = stu.id === selectedStudentId;
                return (
                  <li key={stu.id}>
                    <button
                      type="button"
                      onClick={() => selectStudent(stu.id)}
                      title={stu.name}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                        isSelected
                          ? 'border-teal-400 bg-slate-800 text-white'
                          : 'border-slate-800 bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:border-slate-600 hover:bg-slate-800/80'
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-slate-950 tabular-nums"
                          style={{ backgroundColor: stu.shopColor }}
                        >
                          {stu.studentCode}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold leading-snug">
                            {stu.name}
                          </p>
                          <p className="truncate text-sm text-[var(--ink-muted)]">
                            {t(`sidebar.branch.${stu.shopBranch}`)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end tabular-nums">
                        <span className="rounded-md bg-amber-400 px-2 py-0.5 text-sm font-extrabold text-slate-950">
                          {t('sidebar.levelBadge', { level: stu.level })}
                        </span>
                        <span className="mt-0.5 text-sm font-semibold text-[var(--ink-muted)]">
                          {t('sidebar.pointsSummary', {
                            points: stu.totalPoints,
                          })}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Selected Student Shop Detail & Quick Controls */}
        {selectedStudent && progress && (
          <section
            aria-label={t('sidebar.selectedCardTitle')}
            className="max-h-[54%] overflow-y-auto border-t-2 border-teal-500/60 bg-slate-900 p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-sm font-bold text-teal-300 tabular-nums">
                  #{selectedStudent.studentCode} •{' '}
                  {t('sidebar.levelBadge', { level: selectedStudent.level })} •{' '}
                  {t('sidebar.pointsSummary', {
                    points: selectedStudent.totalPoints,
                  })}
                </span>
                <h3
                  title={selectedStudent.name}
                  className="truncate text-xl font-extrabold text-white"
                >
                  {selectedStudent.name}
                </h3>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    void useCases?.callStudentByLot(selectedStudent.lotNumber)
                  }
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-primary)] px-2.5 py-1.5 text-sm font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                >
                  <Megaphone className="size-4" aria-hidden="true" />
                  <span>{t('sidebar.callStudentBtn')}</span>
                </button>
                <button
                  type="button"
                  aria-label={t('sidebar.closeSelection')}
                  title={t('sidebar.closeSelection')}
                  onClick={() => selectStudent(null)}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-sm font-semibold text-[var(--ink-muted)] tabular-nums">
                <span>
                  {selectedStudent.level >= 20
                    ? t('sidebar.maxLevelReached')
                    : t('sidebar.progressLabel', {
                        current: progress.current,
                        needed: progress.needed,
                      })}
                </span>
                <span>{Math.round(progress.ratio * 100)}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress.ratio * 100)}
                aria-label={t('sidebar.progressLabel', {
                  current: progress.current,
                  needed: progress.needed,
                })}
                className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-800"
              >
                <div
                  className="h-full w-full origin-left bg-teal-400 transition-transform duration-200 ease-out"
                  style={{ transform: `scaleX(${progress.ratio})` }}
                />
              </div>
            </div>

            {/* Quick Award Buttons (+1 / +2 / +5 / -1) */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleAward(selectedStudent.id, 1, 'participate')
                }
                className="rounded-xl bg-emerald-600 px-3 py-2 text-base font-bold text-white transition-transform duration-150 hover:bg-emerald-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                {t('city.awardPlus1')}
              </button>
              <button
                type="button"
                onClick={() => handleAward(selectedStudent.id, 2, 'good_work')}
                className="rounded-xl bg-teal-600 px-3 py-2 text-base font-bold text-white transition-transform duration-150 hover:bg-teal-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                {t('city.awardPlus2')}
              </button>
              <button
                type="button"
                onClick={() => handleAward(selectedStudent.id, 5, 'excellent')}
                className="rounded-xl bg-[var(--brand-accent)] px-3 py-2 text-base font-extrabold text-slate-950 transition-transform duration-150 hover:brightness-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                {t('city.awardPlus5')}
              </button>
              <button
                type="button"
                onClick={() => handleAward(selectedStudent.id, -1, 'reminder')}
                className="rounded-xl bg-rose-600 px-3 py-2 text-base font-bold text-white transition-transform duration-150 hover:bg-rose-500 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
              >
                {t('city.awardMinus1')}
              </button>
            </div>

            {/* Perks Inventory */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--ink-primary)]">
                  <Gift className="size-4 text-amber-400" aria-hidden="true" />
                  {t('sidebar.perksTitle')}
                </span>
                {unusedDoubleCount > 0 && (
                  <button
                    type="button"
                    aria-pressed={useDoublePointsOnNextAward}
                    onClick={() =>
                      setUseDoublePointsOnNextAward(!useDoublePointsOnNextAward)
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-extrabold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
                      useDoublePointsOnNextAward
                        ? 'bg-amber-400 text-slate-950'
                        : 'border border-amber-400/50 bg-slate-900 text-amber-300 hover:bg-slate-800'
                    )}
                  >
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    <span>
                      {useDoublePointsOnNextAward
                        ? t('callout.doublePerkActive')
                        : t('callout.useDoublePerk', {
                            count: unusedDoubleCount,
                          })}
                    </span>
                  </button>
                )}
              </div>
              {unusedPerks.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--ink-muted)] text-pretty">
                  {t('sidebar.noPerks')}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {unusedPerks.map((perk) => (
                    <span
                      key={perk.id}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-bold text-amber-300"
                    >
                      {t(`sidebar.perk.${perk.kind}`)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar & Branch Selectors */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="student-avatar-select"
                  className="block text-sm font-bold text-[var(--ink-muted)]"
                >
                  {t('sidebar.customizeAvatar')}
                </label>
                <select
                  id="student-avatar-select"
                  value={selectedStudent.equippedAvatarId}
                  onChange={(e) =>
                    void useCases?.changeAvatar(
                      selectedStudent.id,
                      e.target.value
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-2.5 py-2 text-sm font-bold text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {AVATAR_OPTIONS.map((avId) => (
                    <option key={avId} value={avId}>
                      {t(`sidebar.avatar.${avId}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="student-branch-select"
                  className="block text-sm font-bold text-[var(--ink-muted)]"
                >
                  {t('sidebar.customizeBranch')}
                </label>
                <select
                  id="student-branch-select"
                  value={selectedStudent.shopBranch}
                  onChange={(e) =>
                    void useCases?.changeShopBranch(
                      selectedStudent.id,
                      e.target.value as ShopBranch
                    )
                  }
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-2.5 py-2 text-sm font-bold text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {BRANCH_OPTIONS.map((br) => (
                    <option key={br} value={br}>
                      {t(`sidebar.branch.${br}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pastel Swatches (12 colors) + Custom Validated Hex Input */}
            <div className="mt-3">
              <span className="block text-sm font-bold text-[var(--ink-muted)]">
                {t('sidebar.customizeColor')}
              </span>
              <div className="mt-1.5 grid grid-cols-6 gap-1.5">
                {PASTEL_SHOP_COLORS.map((hex) => {
                  const isCurrent =
                    selectedStudent.shopColor.toUpperCase() ===
                    hex.toUpperCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`${t('sidebar.customizeColor')} ${hex}`}
                      aria-pressed={isCurrent}
                      onClick={() => {
                        setHexDraft(hex);
                        setHexInvalid(false);
                        void useCases?.changeShopColor(selectedStudent.id, hex);
                      }}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-lg border-2 transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                        isCurrent ? 'border-white' : 'border-slate-800'
                      )}
                      style={{ backgroundColor: hex }}
                    >
                      {isCurrent && (
                        <Check
                          className="size-4 text-slate-950"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <label htmlFor="student-hex-input" className="sr-only">
                  {t('sidebar.hexInputLabel')}
                </label>
                <input
                  id="student-hex-input"
                  type="text"
                  value={hexDraft}
                  aria-invalid={hexInvalid}
                  aria-describedby={hexInvalid ? 'student-hex-error' : undefined}
                  onChange={(e) => {
                    setHexDraft(e.target.value);
                    if (hexInvalid) setHexInvalid(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleApplyHex();
                    }
                  }}
                  placeholder="#FDE68A"
                  className={cn(
                    'w-32 rounded-xl border bg-[var(--surface-elevated)] px-3 py-1.5 text-sm font-bold text-[var(--ink-primary)] tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                    hexInvalid ? 'border-rose-500' : 'border-slate-700'
                  )}
                />
                <button
                  type="button"
                  onClick={() => void handleApplyHex()}
                  className="rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                >
                  {t('sidebar.hexApply')}
                </button>
              </div>

              {hexInvalid && (
                <p
                  id="student-hex-error"
                  role="alert"
                  className="mt-1.5 text-sm font-semibold text-rose-400 text-pretty"
                >
                  {t('sidebar.hexInvalid')}
                </p>
              )}
            </div>
          </section>
        )}
      </aside>
    </>
  );
}
