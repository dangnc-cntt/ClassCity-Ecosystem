import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { cn } from '../../../../lib/cn';

export interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  dialogClassName?: string;
  panelClassName?: string;
  children: ReactNode;
}

/**
 * Accessible native `<dialog>` wrapper using `showModal()` (focus trap + native Escape)
 * and GSAP compositor-only (`transform`, `opacity`) pop-in that respects `prefers-reduced-motion`.
 */
export function NativeDialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  dialogClassName,
  panelClassName,
  children,
}: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    tweenRef.current?.kill();
    tweenRef.current = null;

    if (open) {
      if (!dialog.open) {
        previousFocusRef.current =
          typeof document !== 'undefined'
            ? (document.activeElement as HTMLElement | null)
            : null;
        dialog.showModal();
      }

      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      if (!reduced && panelRef.current) {
        tweenRef.current = gsap.fromTo(
          panelRef.current,
          { opacity: 0, scale: 0.96, y: 8 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.24,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
          }
        );
      }
    } else if (dialog.open) {
      dialog.close();
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    }

    return () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
      if (dialog.open) {
        dialog.close();
      }
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
        previousFocusRef.current = null;
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      role={role}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && role !== 'alertdialog') {
          onClose();
        }
      }}
      className={cn(
        'm-auto max-h-[90dvh] w-[min(92vw,42rem)] overflow-visible bg-transparent p-0 text-[var(--ink-primary)] focus:outline-none',
        dialogClassName
      )}
    >
      <div
        ref={panelRef}
        className={cn(
          'max-h-[88dvh] overflow-y-auto rounded-2xl border border-slate-700 bg-[var(--surface)] p-6 shadow-xl',
          panelClassName
        )}
      >
        {children}
      </div>
    </dialog>
  );
}
