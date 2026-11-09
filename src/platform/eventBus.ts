import type { EcoEvent, EcoEventPayloadMap, EcoEventType } from './types/events';
import type { GameId } from './types/models';

const LRU_CAPACITY = 200;

export type EcoEventListener<T extends EcoEventType> = (
  event: EcoEvent<T, EcoEventPayloadMap[T]>
) => void;

export interface PublishEventMeta {
  gameId?: GameId;
  tenantId?: string;
  classroomId?: string;
  eventId?: string;
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Cross-game and cross-tab event bus using EventTarget + BroadcastChannel('ecosystem').
 * Deduplicates incoming events via a 200-entry LRU cache of eventIds and ignores self-instance echoes.
 */
export class EcosystemEventBus {
  readonly instanceId: string;
  private readonly target = new EventTarget();
  private readonly channel: BroadcastChannel | null = null;
  private readonly seenIds = new Set<string>();
  private readonly activeCleanups = new Set<() => void>();
  private disposed = false;

  constructor(options?: { instanceId?: string; channelName?: string; enableBroadcast?: boolean }) {
    this.instanceId = options?.instanceId ?? makeUuid();
    const shouldBroadcast = options?.enableBroadcast ?? true;

    if (shouldBroadcast && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(options?.channelName ?? 'ecosystem');
        this.channel.onmessage = (msg: MessageEvent<unknown>) => {
          if (this.disposed) return;
          const data = msg.data as EcoEvent | undefined;
          if (!data || typeof data !== 'object' || !data.eventId || !data.type) {
            return;
          }
          // Ignore events originating from this same instance
          if (data.source?.instanceId === this.instanceId) {
            return;
          }
          this.dispatchInternal(data, false);
        };
      } catch {
        this.channel = null;
      }
    }
  }

  private markSeen(eventId: string): boolean {
    if (this.seenIds.has(eventId)) {
      return false;
    }
    if (this.seenIds.size >= LRU_CAPACITY) {
      const oldest = this.seenIds.values().next().value;
      if (oldest !== undefined) {
        this.seenIds.delete(oldest);
      }
    }
    this.seenIds.add(eventId);
    return true;
  }

  private dispatchInternal<T extends EcoEventType>(
    event: EcoEvent<T, EcoEventPayloadMap[T]>,
    broadcast: boolean
  ): void {
    if (this.disposed) return;
    if (!this.markSeen(event.eventId)) {
      return;
    }

    this.target.dispatchEvent(new CustomEvent(event.type, { detail: event }));

    if (broadcast && this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Ignore broadcast errors in restricted contexts
      }
    }
  }

  emit<T extends EcoEventType>(event: EcoEvent<T, EcoEventPayloadMap[T]>): void {
    this.dispatchInternal(event, true);
  }

  publish<T extends EcoEventType>(
    type: T,
    payload: EcoEventPayloadMap[T],
    meta?: PublishEventMeta
  ): EcoEvent<T, EcoEventPayloadMap[T]> {
    const event: EcoEvent<T, EcoEventPayloadMap[T]> = {
      type,
      schemaVersion: 1,
      eventId: meta?.eventId ?? makeUuid(),
      occurredAt: new Date().toISOString(),
      source: {
        gameId: meta?.gameId ?? 'classcity',
        instanceId: this.instanceId,
      },
      tenantId: meta?.tenantId ?? 'local',
      classroomId: meta?.classroomId ?? 'class-5a',
      payload,
    };
    this.emit(event);
    return event;
  }

  on<T extends EcoEventType>(type: T, listener: EcoEventListener<T>): () => void {
    if (this.disposed) {
      return () => {};
    }
    const wrapped = (evt: Event) => {
      const custom = evt as CustomEvent<EcoEvent<T, EcoEventPayloadMap[T]>>;
      listener(custom.detail);
    };
    this.target.addEventListener(type, wrapped);
    const cleanup = () => {
      this.target.removeEventListener(type, wrapped);
      this.activeCleanups.delete(cleanup);
    };
    this.activeCleanups.add(cleanup);
    return cleanup;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of Array.from(this.activeCleanups)) {
      cleanup();
    }
    this.activeCleanups.clear();
    this.seenIds.clear();
    if (this.channel) {
      this.channel.onmessage = null;
      this.channel.close();
    }
  }
}
