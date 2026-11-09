import type { EcoEvent, EcoEventType } from './types/events';

export class EcosystemEventBus {
  private readonly target = new EventTarget();

  emit<T extends EcoEventType, P>(event: EcoEvent<T, P>): void {
    this.target.dispatchEvent(new CustomEvent(event.type, { detail: event }));
  }

  dispose(): void {
    // Cleanup in GĐ1
  }
}
