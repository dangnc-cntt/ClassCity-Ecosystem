import type { GameId, Permission, SessionUser } from './models';
import type { RepositoryBundle } from '../ports/repositories';
import type { TelemetryPort } from '../ports/telemetry';
import type { EcosystemEventBus } from '../eventBus';
import type { AssetService } from '../assets/assetService';
import type { EntitlementService } from '../entitlements';
import type { PermissionService } from '../permissions';

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
  bus: EcosystemEventBus;
  assets: AssetService;
  entitlements: EntitlementService;
  permissions: PermissionService;
  telemetry: TelemetryPort;
  audio: { muted: boolean };
  navigate: { toHub(): void };
}
