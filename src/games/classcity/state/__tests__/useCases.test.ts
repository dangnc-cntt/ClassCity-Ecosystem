import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInMemoryAdapter } from '../../../../platform/adapters/memory';
import { createAssetService } from '../../../../platform/assets/assetService';
import { createRepositories } from '../../../../platform/createRepositories';
import { createEntitlementService } from '../../../../platform/entitlements';
import { EcosystemEventBus } from '../../../../platform/eventBus';
import { createPermissionService } from '../../../../platform/permissions';
import { DEFAULT_SESSION_USER } from '../../../../platform/ports/auth';
import { createTelemetry } from '../../../../platform/ports/telemetry';
import type { GameContext } from '../../../../platform/types/manifest';
import { useClassStore } from '../useClassStore';
import { createClassCityUseCases } from '../useCases';

function makeTestGameContext(): GameContext {
  const repos = createRepositories(createInMemoryAdapter({ seed: 20261109 }));
  const bus = new EcosystemEventBus({ enableBroadcast: false });
  const assets = createAssetService({
    customLoader: async () => {
      throw new Error('Procedural fallback in tests');
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

describe('GĐ3 State & Use-Cases (with InMemoryAdapter)', () => {
  let ctx: GameContext;

  beforeEach(() => {
    useClassStore.getState().resetStore();
    ctx = makeTestGameContext();
  });

  it('loads classroom 5A (36 students), computes levels & wonderProgress, and triggers N+1 prefetch for level 19 students', async () => {
    const useCases = createClassCityUseCases(ctx);
    await useCases.loadClassroom('class-5a');

    const state = useClassStore.getState();
    expect(state.students).toHaveLength(36);
    expect(state.wonderProgress).toBeGreaterThan(0);
    expect(state.preloadedAssetIds.length).toBeGreaterThan(0);
    // Level 19 students with 93-94 points trigger prefetch of shop_level_20
    expect(state.prefetchedAssetIds).toContain('shop_level_20');
  });

  it('awards points optimistically, emits LEDGER:POINTS_AWARDED, triggers level-up & N+1 prefetch', async () => {
    const useCases = createClassCityUseCases(ctx);
    await useCases.loadClassroom('class-5a');

    const emittedEvents: number[] = [];
    ctx.bus.on('LEDGER:POINTS_AWARDED', (evt) => {
      emittedEvents.push(evt.payload.totalPoints);
    });

    // Student #2 starts with 3 points (level 1, needs 2 points for level 2)
    const stu2 = useClassStore.getState().students.find((s) => s.studentCode === 2)!;
    expect(stu2.totalPoints).toBe(3);
    expect(stu2.level).toBe(1);

    const res = await useCases.awardPoints({
      studentId: stu2.id,
      delta: 2,
      reason: 'good_work',
    });

    expect(res).toEqual({ totalPoints: 5, oldLevel: 1, newLevel: 2 });
    expect(emittedEvents).toEqual([5]);

    const updatedStu2 = useClassStore
      .getState()
      .students.find((s) => s.id === stu2.id)!;
    expect(updatedStu2.totalPoints).toBe(5);
    expect(updatedStu2.level).toBe(2);
    expect(useClassStore.getState().lastLevelUp?.studentId).toBe(stu2.id);

    // Award +3 more -> 8 points (level 2, missing 2 points for level 3) -> triggers prefetch shop_level_3
    await useCases.awardPoints({
      studentId: stu2.id,
      delta: 3,
      reason: 'participate',
    });
    expect(useClassStore.getState().prefetchedAssetIds).toContain('shop_level_3');
  });

  it('rolls back optimistic store update and pushes error toast if ledger.award fails', async () => {
    const useCases = createClassCityUseCases(ctx);
    await useCases.loadClassroom('class-5a');

    const stu1 = useClassStore.getState().students[0]!;
    const beforePoints = stu1.totalPoints;
    const beforeWonder = useClassStore.getState().wonderProgress;

    vi.spyOn(ctx.repos.ledger, 'award').mockRejectedValueOnce(
      new Error('Storage failure')
    );

    const res = await useCases.awardPoints({
      studentId: stu1.id,
      delta: 5,
      reason: 'excellent',
    });

    expect(res).toBeNull();
    const afterStu1 = useClassStore
      .getState()
      .students.find((s) => s.id === stu1.id)!;
    expect(afterStu1.totalPoints).toBe(beforePoints);
    expect(useClassStore.getState().wonderProgress).toBe(beforeWonder);
    expect(useClassStore.getState().toasts.some((t) => t.kind === 'error')).toBe(
      true
    );
  });

  it('handles Auto-Drive, callStudentByLot, giftBox collection, and settings recalculation', async () => {
    const useCases = createClassCityUseCases(ctx);
    await useCases.loadClassroom('class-5a');

    const plan = useCases.startAutoDrive(42);
    expect(plan).not.toBeNull();
    expect(useClassStore.getState().vehicleState).toBe('accelerating');

    const called = await useCases.callStudentByLot(plan!.targetLotId);
    expect(called).not.toBeNull();
    expect(useClassStore.getState().vehicleState).toBe('called');
    expect(useClassStore.getState().activeModal).toBe('callout');

    // Collect gift box for called student
    const box = useClassStore.getState().giftBoxes[0]!;
    const perk = await useCases.collectGiftBoxForStudent(box.id, called!.id, 7);
    expect(perk).not.toBeNull();

    useCases.dismissCallout();
    expect(useClassStore.getState().vehicleState).toBe('idle');

    // Changing pointsPerLevel recalculates student levels without altering totalPoints
    const stuBefore = useClassStore.getState().students[10]!;
    await useCases.updateSettings({ pointsPerLevel: 10 });
    const stuAfter = useClassStore
      .getState()
      .students.find((s) => s.id === stuBefore.id)!;
    expect(stuAfter.totalPoints).toBe(stuBefore.totalPoints);
    expect(useClassStore.getState().pointsPerLevel).toBe(10);
  });

  it('gates multi-classroom switching behind Pro entitlement and syncs remote awards via bus', async () => {
    const useCases = createClassCityUseCases(ctx);
    await useCases.loadClassroom('class-5a');

    // Free tier cannot switch to class-5b
    const blocked = await useCases.switchClassroom('class-5b');
    expect(blocked).toBe(false);
    expect(useClassStore.getState().activeModal).toBe('upgrade_pro');

    // Upgrade to Pro and switch to class-5b
    await useCases.setSubscriptionTier('pro');
    const switched = await useCases.switchClassroom('class-5b');
    expect(switched).toBe(true);
    expect(useClassStore.getState().activeClassroomId).toBe('class-5b');
    expect(useClassStore.getState().students).toHaveLength(24);

    // Apply remote award from ClassArena
    const targetStu = useClassStore.getState().students[0]!;
    const remoteTx = await ctx.repos.ledger.award({
      studentId: targetStu.id,
      classroomId: 'class-5b',
      gameId: 'classarena',
      delta: 15,
      reason: 'arena_win',
      idempotencyKey: 'remote-tx-1',
      actorUserId: 'local-teacher',
    });

    useCases.applyRemoteAward({
      type: 'LEDGER:POINTS_AWARDED',
      schemaVersion: 1,
      eventId: 'evt-remote-1',
      occurredAt: new Date().toISOString(),
      source: { gameId: 'classarena', instanceId: 'other-tab' },
      tenantId: 'local',
      classroomId: 'class-5b',
      payload: remoteTx,
    });

    const syncedStu = useClassStore
      .getState()
      .students.find((s) => s.id === targetStu.id)!;
    expect(syncedStu.totalPoints).toBe(remoteTx.totalPoints);
  });
});
