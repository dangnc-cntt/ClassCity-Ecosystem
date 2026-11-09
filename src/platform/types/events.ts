import type { GameId, PointTransaction, StudentCore } from './models';

export type EcoEventType =
  | 'LEDGER:POINTS_AWARDED'
  | 'PROFILE:AVATAR_CHANGED'
  | 'ROSTER:STUDENT_UPDATED'
  | 'CLASSROOM:CHANGED'
  | 'GAME:STUDENT_CALLED'
  | 'HUB:NAVIGATE'
  | 'AUDIO:MUTE_CHANGED';

export interface EcoEventPayloadMap {
  'LEDGER:POINTS_AWARDED': {
    tx: PointTransaction;
    totalPoints: number;
  };
  'PROFILE:AVATAR_CHANGED': {
    studentId: string;
    equippedAvatarId: string;
  };
  'ROSTER:STUDENT_UPDATED': {
    student: StudentCore;
  };
  'CLASSROOM:CHANGED': {
    classroomId: string;
  };
  'GAME:STUDENT_CALLED': {
    studentId: string;
    lotNumber: number;
  };
  'HUB:NAVIGATE': {
    target: 'hub' | GameId;
  };
  'AUDIO:MUTE_CHANGED': {
    muted: boolean;
  };
}

export interface EcoEvent<
  T extends EcoEventType = EcoEventType,
  P = EcoEventPayloadMap[T],
> {
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
