import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { t } from '../platform/i18n';
import type {
  GameContext,
  GameHandle,
  GameManifest,
} from '../platform/types/manifest';

interface HostErrorBoundaryProps {
  onCaptureError?: (error: Error) => void;
  onBackToHub: () => void;
  children: ReactNode;
}

interface HostErrorBoundaryState {
  hasError: boolean;
}

class HostErrorBoundary extends Component<
  HostErrorBoundaryProps,
  HostErrorBoundaryState
> {
  override state: HostErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): HostErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    this.props.onCaptureError?.(error);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh w-screen flex-col items-center justify-center bg-[var(--surface)] p-6 text-center text-[var(--ink-primary)]">
          <AlertTriangle
            className="size-12 text-rose-400"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-2xl font-extrabold text-white text-balance">
            {t('host.errorTitle')}
          </h2>
          <p className="mt-2 max-w-md text-base text-[var(--ink-muted)] text-pretty">
            {t('host.errorDesc')}
          </p>
          <button
            type="button"
            onClick={this.props.onBackToHub}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-base font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>{t('host.backToHub')}</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface GameHostProps {
  manifest: GameManifest;
  ctx: GameContext;
  onBackToHub: () => void;
}

/**
 * Lifecycle container that validates permissions/entitlements, dynamically loads
 * `manifest.entry()`, mounts the isolated game root, and guarantees `handle.unmount()`
 * cleanup when returning to the Ecosystem Hub (Rule 4.1 & R5).
 */
export function GameHost({ manifest, ctx, onBackToHub }: GameHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const latestCtxRef = useRef<GameContext>(ctx);
  latestCtxRef.current = ctx;

  const [status, setStatus] = useState<'mounting' | 'ready' | 'error'>(
    'mounting'
  );

  const hasPermissions = manifest.requires.permissions.every((perm) =>
    ctx.permissions.can(perm)
  );
  const hasEntitlements = manifest.requires.entitlements.every((feat) =>
    ctx.entitlements.has(feat)
  );
  const canLaunch = hasPermissions && hasEntitlements;

  // Dynamic entry() -> mount() -> unmount() lifecycle
  useEffect(() => {
    if (!canLaunch) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setStatus('mounting');

    void manifest
      .entry()
      .then((gameModule) => {
        if (cancelled || !containerRef.current) return;
        const handle = gameModule.mount(
          containerRef.current,
          latestCtxRef.current
        );
        handleRef.current = handle;
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        latestCtxRef.current.telemetry.captureError(err, {
          phase: 'GameHost.entry',
          gameId: manifest.id,
        });
        setStatus('error');
      });

    return () => {
      cancelled = true;
      const activeHandle = handleRef.current;
      handleRef.current = null;
      if (activeHandle) {
        void activeHandle.unmount();
      }
    };
  }, [manifest, canLaunch]);

  // Forward runtime context updates without tearing down the mounted game
  useEffect(() => {
    handleRef.current?.onContextChange?.(ctx);
  }, [ctx]);

  if (!canLaunch) {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center bg-[var(--surface)] p-6 text-center text-[var(--ink-primary)]">
        <AlertTriangle
          className="size-12 text-amber-400"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-2xl font-extrabold text-white text-balance">
          {!hasPermissions ? t('permission.denied') : t('host.missingEntitlement')}
        </h2>
        <button
          type="button"
          onClick={onBackToHub}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-base font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>{t('host.backToHub')}</span>
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-dvh w-screen flex-col items-center justify-center bg-[var(--surface)] p-6 text-center text-[var(--ink-primary)]">
        <AlertTriangle className="size-12 text-rose-400" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-extrabold text-white text-balance">
          {t('host.errorTitle')}
        </h2>
        <p className="mt-2 max-w-md text-base text-[var(--ink-muted)] text-pretty">
          {t('host.errorDesc')}
        </p>
        <button
          type="button"
          onClick={onBackToHub}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-base font-bold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>{t('host.backToHub')}</span>
        </button>
      </div>
    );
  }

  return (
    <HostErrorBoundary
      onCaptureError={(err) =>
        ctx.telemetry.captureError(err, {
          phase: 'GameHost.render',
          gameId: manifest.id,
        })
      }
      onBackToHub={onBackToHub}
    >
      <div className="relative h-dvh w-screen overflow-hidden bg-[var(--surface)]">
        {status === 'mounting' && (
          <div
            aria-busy="true"
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-[var(--surface)] text-base font-bold text-[var(--ink-primary)]"
          >
            <Loader2
              className="size-5 animate-spin text-teal-400"
              aria-hidden="true"
            />
            <span>{t('host.mounting')}</span>
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </HostErrorBoundary>
  );
}
