export interface TelemetryPort {
  track(name: string, props?: Record<string, unknown>): void;
  captureError(err: unknown, ctx?: Record<string, unknown>): void;
}

const PII_KEYS = new Set(['name', 'studentName', 'fullName', 'email']);

export function sanitizeTelemetryProps(
  props?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEYS.has(k)) continue;
    sanitized[k] = v;
  }
  return sanitized;
}

export function createTelemetry(options?: {
  enabled?: boolean;
  onTrack?: (name: string, props?: Record<string, unknown>) => void;
  onError?: (err: unknown, ctx?: Record<string, unknown>) => void;
}): TelemetryPort {
  const isDev =
    options?.enabled ??
    (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV));

  return {
    track(name: string, props?: Record<string, unknown>): void {
      const clean = sanitizeTelemetryProps(props);
      options?.onTrack?.(name, clean);
      if (isDev) {
        console.debug(`[telemetry] ${name}`, clean ?? {});
      }
    },
    captureError(err: unknown, ctx?: Record<string, unknown>): void {
      const clean = sanitizeTelemetryProps(ctx);
      options?.onError?.(err, clean);
      if (isDev) {
        console.debug('[telemetry:error]', err, clean ?? {});
      }
    },
  };
}
