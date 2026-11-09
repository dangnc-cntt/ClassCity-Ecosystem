import type { GameId, Permission, SessionUser } from './models';
import type { RepositoryBundle } from '../ports/repositories';
import type { TelemetryPort } from '../ports/telemetry';

export interface GameManifest {
  id: GameId;
  name: string;
  version: string;
  minSdkVersion: string;
  stateSchemaVersion: number;
  requires: {
    permissions: Permission[];
    entitlements: string[];
    webgl: boolean;
  };
  assets: {
    sharedIds: string[];
    gamePrefix: string;
  };
  entry: () => Promise<GameModule>;
}

export interface GameModule {
  mount(el: HTMLElement, ctx: GameContext): GameHandle;
}

export interface GameHandle {
  unmount(): Promise<void>;
  onContextChange?(next: Partial<GameContext>): void;
}

export interface GameContext {
  user: SessionUser;
  classroomId: string;
  repos: RepositoryBundle;
  bus: unknown;
  assets: unknown;
  entitlements: unknown;
  permissions: unknown;
  telemetry: TelemetryPort;
  audio: { muted: boolean };
  navigate: { toHub(): void };
}
