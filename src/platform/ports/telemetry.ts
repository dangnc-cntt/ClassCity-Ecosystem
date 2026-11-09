export interface TelemetryPort {
  track(name: string, props?: Record<string, unknown>): void;
  captureError(err: unknown, ctx?: Record<string, unknown>): void;
}
