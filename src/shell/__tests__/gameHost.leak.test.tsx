import { renderToStaticMarkup } from 'react-dom/server';
import gsap from 'gsap';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { classcityManifest } from '../../games/classcity';
import { ClassCityModule } from '../../games/classcity/ClassCityModule';
import { useClassStore } from '../../games/classcity/state/useClassStore';
import { createInMemoryAdapter } from '../../platform/adapters/memory';
import { createAssetService } from '../../platform/assets/assetService';
import { createSoundEffects } from '../../platform/audio/soundEffects';
import { createRepositories } from '../../platform/createRepositories';
import { createEntitlementService } from '../../platform/entitlements';
import { EcosystemEventBus } from '../../platform/eventBus';
import { createPermissionService } from '../../platform/permissions';
import { DEFAULT_SESSION_USER } from '../../platform/ports/auth';
import { createTelemetry } from '../../platform/ports/telemetry';
import type { GameContext } from '../../platform/types/manifest';
import { disposeObject3D } from '../../three-kit/Disposer';
import { findGameManifest, gameRegistry, upcomingGames } from '../gameRegistry';
import { Shell } from '../Shell';

function makeTestContext(): GameContext {
  const repos = createRepositories(createInMemoryAdapter({ seed: 20261109 }));
  const bus = new EcosystemEventBus({ enableBroadcast: false });
  const assets = createAssetService({
    customLoader: async () => {
      throw new Error('Procedural fallback');
    },
  });
  const entitlements = createEntitlementService('free');
  const permissions = createPermissionService('teacher');
  const telemetry = createTelemetry({ enabled: false });

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
    navigate: { toHub: () => {} },
  };
}

describe('GĐ7 Hub, GameHost Manifest Contract & Resource Leak Gate', () => {
  let audioCloseSpy: ReturnType<typeof vi.fn>;
  let audioCreatedCount = 0;

  beforeEach(() => {
    useClassStore.getState().resetStore();
    audioCreatedCount = 0;
    audioCloseSpy = vi.fn(async () => {});

    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      constructor() {
        audioCreatedCount += 1;
      }
      resume = async () => {};
      createOscillator = () => ({
        type: 'sine',
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      });
      createGain = () => ({
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      });
      close = audioCloseSpy;
    }

    (
      globalThis as unknown as {
        window: { AudioContext: typeof FakeAudioContext };
      }
    ).window = {
      AudioContext: FakeAudioContext,
    };
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    vi.restoreAllMocks();
  });

  it('exposes classcityManifest in gameRegistry with dynamic entry() loader and 3 upcoming ecosystem games', async () => {
    expect(gameRegistry).toHaveLength(1);
    expect(findGameManifest('classcity')).toBe(classcityManifest);
    expect(upcomingGames.map((g) => g.id)).toEqual([
      'classfarm',
      'classarena',
      'classquest',
    ]);

    const loadedModule = await classcityManifest.entry();
    expect(typeof loadedModule.mount).toBe('function');
  });

  it('renders Ecosystem Hub game-picker screen (1 active card + 3 coming-soon cards) and updates tier badge immediately on Free <-> Pro switch', () => {
    const ctx = makeTestContext();

    const htmlFree = renderToStaticMarkup(
      <Shell initialContext={ctx} startInHub={true} />
    );
    expect(htmlFree).toContain('ClassCity 3D');
    expect(htmlFree).toContain('ClassFarm');
    expect(htmlFree).toContain('ClassArena');
    expect(htmlFree).toContain('ClassQuest');
    expect(htmlFree).toContain('Gói Free');

    // Switch tier Free -> Pro at runtime; Hub badge updates immediately without reload
    ctx.entitlements.setTier('pro');
    expect(ctx.entitlements.has('classcity.multi_class')).toBe(true);
    expect(ctx.entitlements.has('classcity.leaderboard_export')).toBe(true);

    const htmlPro = renderToStaticMarkup(
      <Shell initialContext={ctx} startInHub={true} />
    );
    expect(htmlPro).toContain('Gói Pro');

    // Also verify ClassCityModule renders cleanly in 2D fallback mode when WebGL is absent
    const html2DFallback = renderToStaticMarkup(<ClassCityModule ctx={ctx} />);
    expect(html2DFallback).toContain('Auto Lái Gọi Tên');

    ctx.assets.dispose();
    ctx.bus.dispose();
  });

  it('closes AudioContext, unsubscribes bus listeners, kills GSAP tweens, and disposes Three resources across 3 mount/unmount cycles', async () => {
    const ctx = makeTestContext();
    let staleListenerCalls = 0;

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      // 1. Audio lifecycle
      const sound = createSoundEffects({ bus: ctx.bus });
      sound.playPointAward(5);
      sound.playFanfare();

      // 2. EventBus listener lifecycle
      const unsubAward = ctx.bus.on('LEDGER:POINTS_AWARDED', () => {
        staleListenerCalls += 1;
      });

      // 3. GSAP tween lifecycle
      const target = { scale: 1 };
      const tween = gsap.to(target, { scale: 1.35, duration: 2 });

      // 4. Three.js Object3D disposal lifecycle
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const tex = new THREE.Texture();
      const mat = new THREE.MeshStandardMaterial({ map: tex });
      const mesh = new THREE.Mesh(geom, mat);
      const group = new THREE.Group();
      group.add(mesh);

      const geomDispose = vi.spyOn(geom, 'dispose');
      const matDispose = vi.spyOn(mat, 'dispose');
      const texDispose = vi.spyOn(tex, 'dispose');

      // Simulate GameHost unmount back to Hub
      unsubAward();
      tween.kill();
      disposeObject3D(group);
      await sound.dispose();

      expect(geomDispose).toHaveBeenCalledTimes(1);
      expect(matDispose).toHaveBeenCalledTimes(1);
      expect(texDispose).toHaveBeenCalledTimes(1);
      expect(gsap.globalTimeline.getChildren().length).toBe(0);
    }

    // Verify all 3 AudioContexts were created and explicitly closed
    expect(audioCreatedCount).toBe(3);
    expect(audioCloseSpy).toHaveBeenCalledTimes(3);

    // Emit an event after unmounting all 3 cycles -> zero stale listeners invoked
    ctx.bus.publish('LEDGER:POINTS_AWARDED', {
      tx: {
        id: 'tx-post-unmount',
        tenantId: 'local',
        studentId: 'stu-1',
        classroomId: 'class-5a',
        gameId: 'classarena',
        delta: 5,
        reason: 'post_unmount_check',
        idempotencyKey: 'idem-post-unmount',
        createdAt: new Date().toISOString(),
        actorUserId: 'local-teacher',
      },
      totalPoints: 10,
    });
    expect(staleListenerCalls).toBe(0);

    ctx.assets.dispose();
    ctx.bus.dispose();
  });
});
