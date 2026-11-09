import type { GameId } from './models';

export type EcoEventType =
  | 'LEDGER:POINTS_AWARDED'
  | 'PROFILE:AVATAR_CHANGED'
  | 'ROSTER:STUDENT_UPDATED'
  | 'CLASSROOM:CHANGED'
  | 'GAME:STUDENT_CALLED'
  | 'HUB:NAVIGATE'
  | 'AUDIO:MUTE_CHANGED';

export interface EcoEvent<T extends EcoEventType = EcoEventType, P = unknown> {
  type: T;
  schemaVersion: 1;
  eventId: string;
  occurredAt: string;
  source: {
    gameId: GameId;
    instanceId: string;
  };
  tenantId: string;
  classroomId: string;
  payload: P;
}
