import { useEffect, useState } from 'react';
import { Keyboard, RotateCcw, Save, Settings, TriangleAlert, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import { t } from '../../../../platform/i18n';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';
import { NativeDialog } from './NativeDialog';

export interface SettingsModalProps {
  useCases: ClassCityUseCases | null;
}

/**
 * Classroom & display settings modal (`pointsPerLevel`, `vi/en` locale, `lowPowerMode`,
 * white-label `--brand-*` colors, keyboard shortcuts, and `alertdialog`-guarded seed reset).
 */
export function SettingsModal({ useCases }: SettingsModalProps) {
  const {
    activeModal,
    pointsPerLevel,
    locale,
    lowPowerMode,
    brand,
    setActiveModal,
    pushToast,
  } = useClassStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      pointsPerLevel: s.pointsPerLevel,
      locale: s.locale,
      lowPowerMode: s.lowPowerMode,
      brand: s.brand,
      setActiveModal: s.setActiveModal,
      pushToast: s.pushToast,
    }))
  );

  const isOpen = activeModal === 'settings';

  const [pplDraft, setPplDraft] = useState(String(pointsPerLevel));
  const [pplInvalid, setPplInvalid] = useState(false);
  const [lowPowerDraft, setLowPowerDraft] = useState(lowPowerMode);
  const [brandNameDraft, setBrandNameDraft] = useState(brand.name);
  const [brandPrimaryDraft, setBrandPrimaryDraft] = useState(brand.primary);
  const [brandAccentDraft, setBrandAccentDraft] = useState(brand.accent);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPplDraft(String(pointsPerLevel));
      setPplInvalid(false);
      setLowPowerDraft(lowPowerMode);
      setBrandNameDraft(brand.name);
      setBrandPrimaryDraft(brand.primary);
      setBrandAccentDraft(brand.accent);
      setConfirmResetOpen(false);
    }
  }, [isOpen, pointsPerLevel, lowPowerMode, brand]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!useCases) return;

    const parsedPpl = Number(pplDraft);
    if (!Number.isInteger(parsedPpl) || parsedPpl < 1 || parsedPpl > 50) {
      setPplInvalid(true);
      return;
    }

    await useCases.updateSettings({
      pointsPerLevel: parsedPpl,
      lowPowerMode: lowPowerDraft,
      brand: {
        name: brandNameDraft.trim() || 'ClassCity',
        primary: brandPrimaryDraft,
        accent: brandAccentDraft,
      },
    });
    pushToast(t('settings.savedToast'), 'success');
    setActiveModal('none');
  };

  return (
    <>
      <NativeDialog
        open={isOpen}
        onClose={() => setActiveModal('none')}
        labelledBy="settings-modal-title"
        dialogClassName="w-[min(94vw,40rem)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white">
              <Settings className="size-5" aria-hidden="true" />
            </div>
            <h2
              id="settings-modal-title"
              className="text-xl font-extrabold text-white text-balance sm:text-2xl"
            >
              {t('settings.title')}
            </h2>
          </div>

          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setActiveModal('none')}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-slate-700 bg-[var(--surface-elevated)] text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-5">
          {/* Language Switcher (applies immediately) */}
          <div>
            <span className="block text-base font-bold text-[var(--ink-primary)]">
              {t('settings.localeLabel')}
            </span>
            <div className="mt-2 inline-flex rounded-xl border border-slate-700 bg-[var(--surface-elevated)] p-1">
              {(['vi', 'en'] as const).map((loc) => {
                const active = locale === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void useCases?.updateSettings({ locale: loc })}
                    className={cn(
                      'rounded-lg px-4 py-1.5 text-base font-bold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                      active
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'text-[var(--ink-muted)] hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    {loc === 'vi'
                      ? t('settings.localeVi')
                      : t('settings.localeEn')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Points Per Level */}
          <div>
            <label
              htmlFor="settings-ppl-input"
              className="block text-base font-bold text-[var(--ink-primary)]"
            >
              {t('settings.pointsPerLevelLabel')}
            </label>
            <input
              id="settings-ppl-input"
              type="number"
              min={1}
              max={50}
              step={1}
              required
              value={pplDraft}
              aria-invalid={pplInvalid}
              aria-describedby={
                pplInvalid ? 'settings-ppl-error' : 'settings-ppl-help'
              }
              onChange={(e) => {
                setPplDraft(e.target.value);
                if (pplInvalid) setPplInvalid(false);
              }}
              className={cn(
                'mt-1.5 w-36 rounded-xl border bg-[var(--surface-elevated)] px-3.5 py-2 text-base font-bold text-white tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                pplInvalid ? 'border-rose-500' : 'border-slate-700'
              )}
            />
            {pplInvalid ? (
              <p
                id="settings-ppl-error"
                role="alert"
                className="mt-1.5 text-sm font-semibold text-rose-400"
              >
                {t('settings.pointsPerLevelInvalid')}
              </p>
            ) : (
              <p
                id="settings-ppl-help"
                className="mt-1.5 text-sm text-[var(--ink-muted)] text-pretty"
              >
                {t('settings.pointsPerLevelHelp')}
              </p>
            )}
          </div>

          {/* Low Power Mode */}
          <div className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-3.5">
            <div className="flex items-start gap-3">
              <input
                id="settings-low-power"
                type="checkbox"
                checked={lowPowerDraft}
                aria-describedby="settings-low-power-help"
                onChange={(e) => setLowPowerDraft(e.target.checked)}
                className="mt-1 size-5 rounded border-slate-600 accent-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
              />
              <div>
                <label
                  htmlFor="settings-low-power"
                  className="text-base font-bold text-white"
                >
                  {t('settings.lowPowerLabel')}
                </label>
                <p
                  id="settings-low-power-help"
                  className="mt-0.5 text-sm text-[var(--ink-muted)] text-pretty"
                >
                  {t('settings.lowPowerHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* White-label Branding */}
          <fieldset className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-3.5">
            <legend className="px-1.5 text-base font-bold text-white">
              {t('settings.brandSection')}
            </legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label
                  htmlFor="settings-brand-name"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('settings.brandNameLabel')}
                </label>
                <input
                  id="settings-brand-name"
                  type="text"
                  maxLength={32}
                  value={brandNameDraft}
                  onChange={(e) => setBrandNameDraft(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-brand-primary"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('settings.brandPrimaryLabel')}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="settings-brand-primary"
                    type="color"
                    value={brandPrimaryDraft}
                    onChange={(e) => setBrandPrimaryDraft(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                  />
                  <span className="text-sm font-bold text-[var(--ink-primary)] tabular-nums">
                    {brandPrimaryDraft.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="settings-brand-accent"
                  className="block text-sm font-semibold text-[var(--ink-muted)]"
                >
                  {t('settings.brandAccentLabel')}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="settings-brand-accent"
                    type="color"
                    value={brandAccentDraft}
                    onChange={(e) => setBrandAccentDraft(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-1"
                  />
                  <span className="text-sm font-bold text-[var(--ink-primary)] tabular-nums">
                    {brandAccentDraft.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Keyboard Shortcuts Reference */}
          <div className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-3.5">
            <h3 className="inline-flex items-center gap-2 text-base font-bold text-white">
              <Keyboard className="size-4 text-teal-400" aria-hidden="true" />
              <span>{t('settings.shortcutsSection')}</span>
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--ink-muted)]">
              <li>{t('settings.shortcutMove')}</li>
              <li>{t('settings.shortcutTab')}</li>
              <li>{t('settings.shortcutEsc')}</li>
            </ul>
          </div>

          {/* Reset Sample Data Section */}
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3.5">
            <h3 className="text-base font-bold text-rose-300">
              {t('settings.resetSection')}
            </h3>
            <p className="mt-1 text-sm text-[var(--ink-muted)] text-pretty">
              {t('settings.resetDesc')}
            </p>
            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-rose-500/60 bg-rose-900/60 px-3.5 py-2 text-sm font-bold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              <span>{t('settings.resetBtn')}</span>
            </button>
          </div>

          {/* Form Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2 text-base font-extrabold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
            >
              <Save className="size-4" aria-hidden="true" />
              <span>{t('settings.saveBtn')}</span>
            </button>
          </div>
        </form>
      </NativeDialog>

      {/* Destructive Reset Confirmation AlertDialog */}
      <NativeDialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        role="alertdialog"
        labelledBy="reset-confirm-title"
        describedBy="reset-confirm-desc"
        dialogClassName="w-[min(92vw,28rem)]"
        panelClassName="border-rose-500"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert
            className="mt-0.5 size-6 shrink-0 text-rose-400"
            aria-hidden="true"
          />
          <div>
            <h3
              id="reset-confirm-title"
              className="text-xl font-extrabold text-white text-balance"
            >
              {t('settings.resetConfirmTitle')}
            </h3>
            <p
              id="reset-confirm-desc"
              className="mt-2 text-base text-[var(--ink-muted)] text-pretty"
            >
              {t('settings.resetConfirmDesc')}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(false)}
            className="rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmResetOpen(false);
              void useCases?.resetToSeedData();
            }}
            className="rounded-xl bg-rose-600 px-4 py-2 text-base font-extrabold text-white hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
          >
            {t('settings.resetConfirmAction')}
          </button>
        </div>
      </NativeDialog>
    </>
  );
}

export default SettingsModal;
