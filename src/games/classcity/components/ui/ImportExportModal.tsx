import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderSync,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../../../lib/cn';
import {
  parseStudentRosterCsv,
  validateEcosystemBackup,
  type EcosystemBackupEnvelope,
  type ParsedStudentRow,
} from '../../../../platform/backup';
import { t } from '../../../../platform/i18n';
import type { ValidationIssue } from '../../../../platform/ports/repositories';
import type { ClassCityUseCases } from '../../state/useCases';
import { useClassStore } from '../../state/useClassStore';
import { NativeDialog } from './NativeDialog';

export interface ImportExportModalProps {
  useCases: ClassCityUseCases | null;
}

function downloadJsonFile(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
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
 * Backup JSON export/import and strict CSV student roster importer
 * with per-line error reporting and `alertdialog` overwrite confirmations (Rule 9).
 */
export function ImportExportModal({ useCases }: ImportExportModalProps) {
  const { activeModal, locale, setActiveModal, pushToast } = useClassStore(
    useShallow((s) => ({
      activeModal: s.activeModal,
      locale: s.locale,
      setActiveModal: s.setActiveModal,
      pushToast: s.pushToast,
    }))
  );

  void locale;

  const isOpen = activeModal === 'import_export';

  const [backupIssues, setBackupIssues] = useState<ValidationIssue[]>([]);
  const [pendingBackup, setPendingBackup] =
    useState<EcosystemBackupEnvelope | null>(null);

  const [csvText, setCsvText] = useState('');
  const [csvIssues, setCsvIssues] = useState<ValidationIssue[]>([]);
  const [pendingCsvRows, setPendingCsvRows] = useState<
    ParsedStudentRow[] | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      setBackupIssues([]);
      setPendingBackup(null);
      setCsvIssues([]);
      setPendingCsvRows(null);
    }
  }, [isOpen]);

  const handleExportBackup = async () => {
    if (!useCases) return;
    const envelope = await useCases.exportBackup();
    const datePart = envelope.exportedAt.slice(0, 10);
    downloadJsonFile(`classcity-backup-v1-${datePart}.json`, envelope);
    pushToast(t('importExport.exportBackupSuccess'), 'success');
  };

  const handleBackupFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed: unknown = JSON.parse(rawText);
      const result = validateEcosystemBackup(parsed);
      if (!result.ok) {
        setBackupIssues(result.issues);
        setPendingBackup(null);
        return;
      }
      setBackupIssues([]);
      setPendingBackup(result.backup);
    } catch {
      setBackupIssues([
        { field: 'json', message: t('importExport.backupParseError') },
      ]);
      setPendingBackup(null);
    }
  };

  const handleCsvFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setCsvIssues([]);
  };

  const handleValidateCsv = () => {
    const parsed = parseStudentRosterCsv(csvText);
    if (!parsed.ok) {
      setCsvIssues(parsed.issues);
      setPendingCsvRows(null);
      return;
    }
    setCsvIssues([]);
    setPendingCsvRows(parsed.rows);
  };

  return (
    <>
      <NativeDialog
        open={isOpen}
        onClose={() => setActiveModal('none')}
        labelledBy="import-export-modal-title"
        dialogClassName="w-[min(94vw,44rem)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white">
              <FolderSync className="size-5" aria-hidden="true" />
            </div>
            <h2
              id="import-export-modal-title"
              className="text-xl font-extrabold text-white text-balance sm:text-2xl"
            >
              {t('importExport.title')}
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

        <div className="mt-4 space-y-5">
          {/* Section 1: backup.json */}
          <section className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4">
            <h3 className="text-lg font-extrabold text-white">
              {t('importExport.backupSection')}
            </h3>
            <p className="mt-1 text-base text-[var(--ink-muted)] text-pretty">
              {t('importExport.backupDesc')}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleExportBackup()}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-base font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
              >
                <Download className="size-4" aria-hidden="true" />
                <span>{t('importExport.exportBackupBtn')}</span>
              </button>

              <div>
                <label
                  htmlFor="backup-json-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-400"
                >
                  <Upload className="size-4 text-teal-300" aria-hidden="true" />
                  <span>{t('importExport.importBackupLabel')}</span>
                  <input
                    id="backup-json-upload"
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => void handleBackupFileSelected(e)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {backupIssues.length > 0 && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-3 rounded-xl border border-rose-500/60 bg-rose-950/50 p-3 text-sm text-rose-200"
              >
                <p className="font-bold text-rose-300">
                  {t('importExport.validationFailedTitle', {
                    count: backupIssues.length,
                  })}
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-1">
                  {backupIssues.map((iss, idx) => (
                    <li key={`${iss.field}-${idx}`}>
                      <span className="font-semibold">{iss.field}:</span>{' '}
                      {iss.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Section 2: CSV Student Roster */}
          <section className="rounded-xl border border-slate-800 bg-[var(--surface-elevated)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  {t('importExport.csvSection')}
                </h3>
                <p className="mt-1 text-base text-[var(--ink-muted)] text-pretty">
                  {t('importExport.csvDesc')}
                </p>
              </div>

              <label
                htmlFor="roster-csv-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3.5 py-2 text-sm font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-400"
              >
                <FileSpreadsheet
                  className="size-4 text-amber-300"
                  aria-hidden="true"
                />
                <span>{t('importExport.csvFileLabel')}</span>
                <input
                  id="roster-csv-upload"
                  type="file"
                  accept=".csv,text/csv,.txt"
                  onChange={(e) => void handleCsvFileSelected(e)}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="mt-3">
              <label
                htmlFor="roster-csv-textarea"
                className="block text-sm font-bold text-[var(--ink-muted)]"
              >
                {t('importExport.csvTextareaLabel')}
              </label>
              <textarea
                id="roster-csv-textarea"
                rows={6}
                value={csvText}
                aria-invalid={csvIssues.length > 0}
                aria-describedby={
                  csvIssues.length > 0 ? 'csv-validation-errors' : undefined
                }
                onChange={(e) => {
                  setCsvText(e.target.value);
                  if (csvIssues.length > 0) setCsvIssues([]);
                }}
                placeholder={t('importExport.csvPlaceholder')}
                className={cn(
                  'mt-1.5 w-full rounded-xl border bg-slate-900 p-3 text-base text-white placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400',
                  csvIssues.length > 0 ? 'border-rose-500' : 'border-slate-700'
                )}
              />
            </div>

            {csvIssues.length > 0 && (
              <div
                id="csv-validation-errors"
                role="alert"
                aria-live="assertive"
                className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-rose-500/60 bg-rose-950/50 p-3 text-sm text-rose-200"
              >
                <p className="font-bold text-rose-300">
                  {t('importExport.validationFailedTitle', {
                    count: csvIssues.length,
                  })}
                </p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 tabular-nums">
                  {csvIssues.map((iss, idx) => (
                    <li key={`${iss.row ?? 0}-${iss.field}-${idx}`}>
                      {iss.row !== undefined
                        ? t('importExport.rowIssuePrefix', { row: iss.row })
                        : ''}
                      {iss.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleValidateCsv}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-base font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                <span>{t('importExport.validateAndImportBtn')}</span>
              </button>
            </div>
          </section>
        </div>
      </NativeDialog>

      {/* AlertDialog: Confirm Backup Restore */}
      <NativeDialog
        open={pendingBackup !== null}
        onClose={() => setPendingBackup(null)}
        role="alertdialog"
        labelledBy="confirm-backup-title"
        describedBy="confirm-backup-desc"
        dialogClassName="w-[min(92vw,28rem)]"
        panelClassName="border-amber-400"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert
            className="mt-0.5 size-6 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <div>
            <h3
              id="confirm-backup-title"
              className="text-xl font-extrabold text-white text-balance"
            >
              {t('importExport.backupConfirmTitle')}
            </h3>
            <p
              id="confirm-backup-desc"
              className="mt-2 text-base text-[var(--ink-muted)] tabular-nums text-pretty"
            >
              {t('importExport.backupConfirmDesc', {
                classCount: pendingBackup?.data.classrooms.length ?? 0,
                studentCount: pendingBackup?.data.students.length ?? 0,
              })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setPendingBackup(null)}
            className="rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              const snapshot = pendingBackup;
              setPendingBackup(null);
              if (!snapshot || !useCases) return;
              void useCases.importBackup(snapshot).then((res) => {
                if (res.ok) {
                  setActiveModal('none');
                } else {
                  setBackupIssues(res.issues);
                }
              });
            }}
            className="rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-base font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {t('importExport.backupConfirmAction')}
          </button>
        </div>
      </NativeDialog>

      {/* AlertDialog: Confirm CSV Roster Overwrite */}
      <NativeDialog
        open={pendingCsvRows !== null}
        onClose={() => setPendingCsvRows(null)}
        role="alertdialog"
        labelledBy="confirm-csv-title"
        describedBy="confirm-csv-desc"
        dialogClassName="w-[min(92vw,28rem)]"
        panelClassName="border-amber-400"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert
            className="mt-0.5 size-6 shrink-0 text-amber-400"
            aria-hidden="true"
          />
          <div>
            <h3
              id="confirm-csv-title"
              className="text-xl font-extrabold text-white text-balance"
            >
              {t('importExport.csvConfirmTitle')}
            </h3>
            <p
              id="confirm-csv-desc"
              className="mt-2 text-base text-[var(--ink-muted)] tabular-nums text-pretty"
            >
              {t('importExport.csvConfirmDesc', {
                count: pendingCsvRows?.length ?? 0,
              })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setPendingCsvRows(null)}
            className="rounded-xl border border-slate-700 bg-[var(--surface-elevated)] px-4 py-2 text-base font-bold text-[var(--ink-primary)] hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              const rows = pendingCsvRows;
              setPendingCsvRows(null);
              if (!rows || !useCases) return;
              void useCases.importRosterRows(rows).then((ok) => {
                if (ok) {
                  setCsvText('');
                  setActiveModal('none');
                }
              });
            }}
            className="rounded-xl bg-[var(--brand-accent)] px-4 py-2 text-base font-extrabold text-slate-950 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            {t('importExport.csvConfirmAction')}
          </button>
        </div>
      </NativeDialog>
    </>
  );
}

export default ImportExportModal;
