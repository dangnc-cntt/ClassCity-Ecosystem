import { useEffect, useMemo } from 'react';
import { createBrowserAdapter } from '../platform/adapters';
import { createAssetService } from '../platform/assets/assetService';
import { createRepositories } from '../platform/createRepositories';
import { createEntitlementService } from '../platform/entitlements';
import { EcosystemEventBus } from '../platform/eventBus';
import { createPermissionService } from '../platform/permissions';
import { DEFAULT_SESSION_USER } from '../platform/ports/auth';
import { createTelemetry } from '../platform/ports/telemetry';
import type { GameContext } from '../platform/types/manifest';
import { EcosystemDevPanel } from './EcosystemDevPanel';
import { GameHost } from './GameHost';

export function Shell() {
  const ctx = useMemo<GameContext>(() => {
    const repos = createRepositories(
      createBrowserAdapter({ autoSeed: true, seed: 20261109 })
    );
    const bus = new EcosystemEventBus();
    const telemetry = createTelemetry();
    const assets = createAssetService({ telemetry });
    const entitlements = createEntitlementService('free');
    const permissions = createPermissionService('teacher');

    return {
      user: DEFAULT_SESSION_USER,
      classroomId: 'class-5a',
      repos,
      bus,
      assets,
      entitlements,
      permissions,
      telemetry,
      audio: { muted: false },
      navigate: {
        toHub: () => {
          bus.publish('HUB:NAVIGATE', { target: 'hub' });
        },
      },
    };
  }, []);

  useEffect(() => {
    return () => {
      ctx.assets.dispose();
      ctx.bus.dispose();
    };
  }, [ctx]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <GameHost ctx={ctx} />
      <EcosystemDevPanel />
    </div>
  );
}
