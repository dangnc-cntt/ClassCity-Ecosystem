import type { StoreApi } from 'zustand';
import {
  exportEcosystemBackup,
  importEcosystemBackup,
  serializeLeaderboardCsv,
  type EcosystemBackupEnvelope,
} from '../../../platform/backup';
import type { ValidationIssue } from '../../../platform/ports/repositories';
import type { GameContext } from '../../../platform/types/manifest';
import type { EcoEvent } from '../../../platform/types/events';
import type { GameId, TenantBrand, Tier } from '../../../platform/types/models';
import { setLocale, t } from '../../../platform/i18n';
import { applyTheme } from '../../../platform/theme/theme';
import { generateCityLayout } from '../config/cityLayout';
import { PASTEL_SHOP_COLORS } from '../config/assetsRegistry';
import {
  DEFAULT_POINTS_PER_LEVEL,
  levelFromPoints,
  needsPrefetch,
} from '../domain/levels';
import {
  consumeDoublePointsPerk,
  GIFT_BOX_RESPAWN_MS,
  pickRandomPerk,
  spawnGiftBoxes,
} from '../domain/perks';
import { selectLeaderboard } from '../domain/selectors';
import {
  planAutoDrive,
  transitionVehicleState,
  type AutoDrivePlan,
} from '../domain/vehicleFsm';
import type {
  ClassroomCityState,
  ClassCityStoreState,
  PerkCard,
  ShopBranch,
  Student,
  StudentCityState,
  VehicleKind,
  WeatherMode,
} from './types';
import { useClassStore } from './useClassStore';

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t0 = Math.imul(a ^ (a >>> 15), 1 | a);
    t0 = (t0 + Math.imul(t0 ^ (t0 >>> 7), 61 | t0)) ^ t0;
    return ((t0 ^ (t0 >>> 14)) >>> 0) / 4294967296;
  };
}

export interface AwardPointsCommand {
  studentId: string;
  delta: number;
  reason: string;
  useDoublePerk?: boolean;
  idempotencyKey?: string;
}

export interface UpdateSettingsCommand {
  pointsPerLevel?: number;
  locale?: 'vi' | 'en';
  lowPowerMode?: boolean;
  muted?: boolean;
  brand?: Partial<TenantBrand>;
}

export function createClassCityUseCases(
  ctx: GameContext,
  store: StoreApi<ClassCityStoreState> = useClassStore
) {
  return {
    /**
     * Loads a classroom's students, city state, layout, and preloads unique 3D assets + N+1 prefetch.
     */
    async loadClassroom(classroomId?: string): Promise<void> {
      store.setState({ isLoading: true });

      const settings = await ctx.repos.settings.getSettings();
      const targetClassroomId =
        classroomId ?? ctx.classroomId ?? settings.activeClassroomId ?? 'class-5a';

      const [classrooms, studentCores, classStateEnv, studentStatesMap] =
        await Promise.all([
          ctx.repos.classrooms.list(),
          ctx.repos.students.listByClassroom(targetClassroomId),
          ctx.repos.gameStates.getClassroomState<ClassroomCityState>(
            targetClassroomId,
            'classcity'
          ),
          ctx.repos.gameStates.getStudentStates<StudentCityState>(
            targetClassroomId,
            'classcity'
          ),
        ]);

      const classData: ClassroomCityState = {
        pointsPerLevel:
          classStateEnv?.data?.pointsPerLevel ?? DEFAULT_POINTS_PER_LEVEL,
        wonderProgress: classStateEnv?.data?.wonderProgress ?? 0,
        weatherMode: classStateEnv?.data?.weatherMode ?? 'sunny',
        vehicleKind: classStateEnv?.data?.vehicleKind ?? 'car',
        calledHistory: classStateEnv?.data?.calledHistory ?? {},
      };

      const ppl = classData.pointsPerLevel;
      let computedWonderProgress = 0;

      const compositeStudents: Student[] = studentCores.map((core, idx) => {
        const stEnv = studentStatesMap[core.id];
        const stData: StudentCityState = {
          lotNumber: stEnv?.data?.lotNumber ?? core.studentCode,
          shopBranch: stEnv?.data?.shopBranch ?? 'bakery',
          shopColor:
            stEnv?.data?.shopColor ??
            PASTEL_SHOP_COLORS[idx % PASTEL_SHOP_COLORS.length]!,
          perks: stEnv?.data?.perks ?? [],
        };
        const level = levelFromPoints(core.totalPoints, ppl);
        computedWonderProgress += core.totalPoints;
        return {
          ...core,
          ...stData,
          level,
        };
      });

      const lotCount = Math.max(36, Math.min(40, compositeStudents.length));
      const layout = generateCityLayout(lotCount);
      const giftBoxes = spawnGiftBoxes(layout.graph, 3, makeRng(20261109));

      // Unique set of levels & avatars present in this classroom -> preloadUnique
      const uniqueAssetSet = new Set<string>();
      const prefetchSet = new Set<string>();

      for (const stu of compositeStudents) {
        uniqueAssetSet.add(`shop_level_${stu.level}`);
        uniqueAssetSet.add(stu.equippedAvatarId);
        if (needsPrefetch(stu.totalPoints, ppl) && stu.level < 20) {
          prefetchSet.add(`shop_level_${stu.level + 1}`);
        }
      }

      const preloadedAssetIds = Array.from(uniqueAssetSet);
      const prefetchedAssetIds = Array.from(prefetchSet);

      setLocale(settings.locale);
      applyTheme(settings.brand);

      store.setState({
        user: ctx.user,
        tier: ctx.entitlements.tier,
        activeClassroomId: targetClassroomId,
        classrooms,
        students: compositeStudents,
        pointsPerLevel: ppl,
        wonderProgress: computedWonderProgress,
        weatherMode: classData.weatherMode,
        vehicleKind: classData.vehicleKind,
        calledHistory: classData.calledHistory,
        layout,
        giftBoxes,
        lowPowerMode: settings.lowPowerMode,
        muted: settings.muted,
        locale: settings.locale,
        brand: settings.brand,
        preloadedAssetIds,
        prefetchedAssetIds,
        isLoading: false,
      });

      void ctx.assets.preloadUnique(preloadedAssetIds);
      if (prefetchedAssetIds.length > 0) {
        ctx.assets.prefetch(prefetchedAssetIds, { priority: 'low' });
      }

      ctx.telemetry.track('classroom_loaded', {
        classroomId: targetClassroomId,
        studentCount: compositeStudents.length,
      });
    },

    /**
     * Switches classroom (checks `classcity.multi_class` entitlement first).
     */
    async switchClassroom(classroomId: string): Promise<boolean> {
      const state = store.getState();
      if (classroomId === state.activeClassroomId) return true;

      if (!ctx.entitlements.has('classcity.multi_class')) {
        store.setState({ activeModal: 'upgrade_pro' });
        return false;
      }

      if (!ctx.permissions.can('class:manage')) {
        state.pushToast(t('permission.denied'), 'error');
        return false;
      }

      await ctx.repos.settings.patchSettings({ activeClassroomId: classroomId });
      await this.loadClassroom(classroomId);
      ctx.bus.publish('CLASSROOM:CHANGED', { classroomId });
      return true;
    },

    /**
     * Optimistic point award + ledger write + event bus emission + N+1 prefetch + rollback on failure.
     */
    async awardPoints(cmd: AwardPointsCommand): Promise<{
      totalPoints: number;
      oldLevel: number;
      newLevel: number;
    } | null> {
      const state = store.getState();
      if (!ctx.permissions.can('ledger:write')) {
        state.pushToast(t('permission.denied'), 'error');
        return null;
      }

      const targetStu = state.students.find((s) => s.id === cmd.studentId);
      if (!targetStu) return null;

      const ppl = state.pointsPerLevel;
      const oldPoints = targetStu.totalPoints;
      const oldLevel = targetStu.level;
      const prevPerks = targetStu.perks;
      const prevWonder = state.wonderProgress;

      const shouldUseDouble =
        (cmd.useDoublePerk ?? state.useDoublePointsOnNextAward) && cmd.delta > 0;

      const perkResult = shouldUseDouble
        ? consumeDoublePointsPerk(
            cmd.delta,
            targetStu.perks,
            new Date().toISOString()
          )
        : {
            effectiveDelta: cmd.delta,
            updatedPerks: [...targetStu.perks],
            consumedPerkId: null,
          };

      const nextPoints = Math.max(0, oldPoints + perkResult.effectiveDelta);
      const actualDelta = nextPoints - oldPoints;
      const newLevel = levelFromPoints(nextPoints, ppl);
      const nextWonder = Math.max(0, prevWonder + actualDelta);
      const nowMs = Date.now();

      // 1. Optimistic store update
      store.setState((prev) => ({
        students: prev.students.map((s) =>
          s.id === cmd.studentId
            ? {
                ...s,
                totalPoints: nextPoints,
                level: newLevel,
                perks: perkResult.updatedPerks,
              }
            : s
        ),
        wonderProgress: nextWonder,
        useDoublePointsOnNextAward: false,
        lastAwardedStudent: {
          studentId: targetStu.id,
          lotNumber: targetStu.lotNumber,
          delta: actualDelta,
          timestamp: nowMs,
        },
        lastLevelUp:
          newLevel > oldLevel
            ? {
                studentId: targetStu.id,
                lotNumber: targetStu.lotNumber,
                oldLevel,
                newLevel,
                timestamp: nowMs,
              }
            : prev.lastLevelUp,
      }));

      try {
        // 2. Persist transaction to immutable ledger
        const awardRes = await ctx.repos.ledger.award({
          studentId: cmd.studentId,
          classroomId: state.activeClassroomId,
          gameId: 'classcity',
          delta: perkResult.effectiveDelta,
          reason: cmd.reason,
          idempotencyKey: cmd.idempotencyKey ?? makeUuid(),
          actorUserId: state.user.userId,
        });

        if (perkResult.consumedPerkId) {
          await ctx.repos.gameStates.patchStudentState<StudentCityState>(
            cmd.studentId,
            'classcity',
            { perks: perkResult.updatedPerks }
          );
        }

        await ctx.repos.gameStates.patchClassroomState<ClassroomCityState>(
          state.activeClassroomId,
          'classcity',
          { wonderProgress: nextWonder }
        );

        // 3. Emit LEDGER:POINTS_AWARDED across EcosystemEventBus
        ctx.bus.publish(
          'LEDGER:POINTS_AWARDED',
          {
            tx: awardRes.tx,
            totalPoints: awardRes.totalPoints,
          },
          { classroomId: state.activeClassroomId }
        );

        ctx.telemetry.track('points_awarded', {
          studentId: cmd.studentId,
          delta: awardRes.tx.delta,
          reason: cmd.reason,
        });

        if (newLevel > oldLevel) {
          ctx.telemetry.track('student_level_up', {
            studentId: cmd.studentId,
            oldLevel,
            newLevel,
          });
        }

        // 4. N+1 Prefetch check
        if (needsPrefetch(awardRes.totalPoints, ppl) && newLevel < 20) {
          const nextShopId = `shop_level_${newLevel + 1}`;
          ctx.assets.prefetch([nextShopId], { priority: 'low' });
          store.setState((prev) => ({
            prefetchedAssetIds: Array.from(
              new Set([...prev.prefetchedAssetIds, nextShopId])
            ),
          }));
        }

        return {
          totalPoints: awardRes.totalPoints,
          oldLevel,
          newLevel,
        };
      } catch (err) {
        // Rollback optimistic update on failure
        ctx.telemetry.captureError(err, { action: 'awardPoints' });
        store.setState((prev) => ({
          students: prev.students.map((s) =>
            s.id === cmd.studentId
              ? {
                  ...s,
                  totalPoints: oldPoints,
                  level: oldLevel,
                  perks: prevPerks,
                }
              : s
          ),
          wonderProgress: prevWonder,
        }));
        store.getState().pushToast(t('ledger.awardErrorRollback'), 'error');
        return null;
      }
    },

    /**
     * Starts an Auto-Pilot patrol drive to pick a weighted random student lot.
     */
    startAutoDrive(seed?: number): AutoDrivePlan | null {
      const state = store.getState();
      if (state.students.length === 0) return null;

      const rng =
        seed !== undefined ? makeRng(seed) : () => Math.random();
      const lastLot = state.calledStudentId
        ? state.students.find((s) => s.id === state.calledStudentId)?.lotNumber ??
          null
        : null;

      const plan = planAutoDrive(
        state.layout.graph,
        state.layout.lots.slice(0, state.students.length),
        state.calledHistory,
        rng,
        { lastCalledLotId: lastLot }
      );

      store.setState({
        vehicleState: transitionVehicleState(state.vehicleState, {
          type: 'START_AUTOPILOT',
        }),
        activeAutoPlan: plan,
        activeModal: 'none',
      });

      ctx.telemetry.track('auto_drive_started', {
        targetLotId: plan.targetLotId,
        durationMs: plan.durationMs,
      });

      return plan;
    },

    /**
     * Called when vehicle finishes parking and zooming in on a student's lot, or when manually calling a student.
     */
    async callStudentByLot(lotNumber: number): Promise<Student | null> {
      const state = store.getState();
      const student = state.students.find((s) => s.lotNumber === lotNumber);
      if (!student) return null;

      const nextHistory: Record<string, number> = {
        ...state.calledHistory,
        [String(lotNumber)]:
          (state.calledHistory[String(lotNumber)] ?? 0) + 1,
      };

      store.setState({
        calledStudentId: student.id,
        selectedStudentId: student.id,
        calledHistory: nextHistory,
        vehicleState: 'called',
        activeModal: 'callout',
        lastAwardedStudent: {
          studentId: student.id,
          lotNumber: student.lotNumber,
          delta: 0,
          timestamp: Date.now(),
        },
      });

      await ctx.repos.gameStates.patchClassroomState<ClassroomCityState>(
        state.activeClassroomId,
        'classcity',
        { calledHistory: nextHistory }
      );

      ctx.bus.publish(
        'GAME:STUDENT_CALLED',
        {
          studentId: student.id,
          lotNumber: student.lotNumber,
        },
        { classroomId: state.activeClassroomId }
      );

      ctx.telemetry.track('student_called', {
        studentId: student.id,
        lotNumber: student.lotNumber,
      });

      return student;
    },

    /**
     * Dismisses the CalloutModal and returns vehicle to idle overview.
     */
    dismissCallout(): void {
      store.setState((prev) => ({
        vehicleState: transitionVehicleState(prev.vehicleState, {
          type: 'DISMISS_CALLOUT',
        }),
        activeAutoPlan: null,
        activeModal: prev.activeModal === 'callout' ? 'none' : prev.activeModal,
      }));
    },

    /**
     * Collects a gift box touched during an active callout/auto-drive and grants a PerkCard to the student.
     */
    async collectGiftBoxForStudent(
      boxId: string,
      studentId: string,
      seed?: number
    ): Promise<PerkCard | null> {
      const state = store.getState();
      const box = state.giftBoxes.find((b) => b.id === boxId && b.active);
      const student = state.students.find((s) => s.id === studentId);
      if (!box || !student) return null;

      const rng = seed !== undefined ? makeRng(seed) : () => Math.random();
      const kind = pickRandomPerk(rng);
      const newCard: PerkCard = {
        id: makeUuid(),
        kind,
        acquiredAt: new Date().toISOString(),
      };

      const updatedPerks = [...student.perks, newCard];
      const respawnAtMs = Date.now() + GIFT_BOX_RESPAWN_MS;

      store.setState((prev) => ({
        giftBoxes: prev.giftBoxes.map((b) =>
          b.id === boxId ? { ...b, active: false, respawnAtMs } : b
        ),
        students: prev.students.map((s) =>
          s.id === studentId ? { ...s, perks: updatedPerks } : s
        ),
      }));

      await ctx.repos.gameStates.patchStudentState<StudentCityState>(
        studentId,
        'classcity',
        { perks: updatedPerks }
      );

      // If lucky_point, immediately grant +1 point via ledger
      if (kind === 'lucky_point') {
        await this.awardPoints({
          studentId,
          delta: 1,
          reason: 'perk:lucky_point',
        });
      }

      return newCard;
    },

    /**
     * Updates student's equipped 3D avatar across the ecosystem.
     */
    async changeAvatar(studentId: string, avatarId: string): Promise<void> {
      const state = store.getState();
      if (!ctx.permissions.can('roster:write')) {
        state.pushToast(t('permission.denied'), 'error');
        return;
      }

      store.setState((prev) => ({
        students: prev.students.map((s) =>
          s.id === studentId ? { ...s, equippedAvatarId: avatarId } : s
        ),
      }));

      await ctx.repos.students.setEquippedAvatar(studentId, avatarId);
      void ctx.assets.get(avatarId, { priority: 'high' });

      ctx.bus.publish(
        'PROFILE:AVATAR_CHANGED',
        {
          studentId,
          equippedAvatarId: avatarId,
        },
        { classroomId: state.activeClassroomId }
      );
    },

    /**
     * Updates student's shop branch (topper).
     */
    async changeShopBranch(
      studentId: string,
      shopBranch: ShopBranch
    ): Promise<void> {
      const state = store.getState();
      if (!ctx.permissions.can('game:configure')) {
        state.pushToast(t('permission.denied'), 'error');
        return;
      }

      store.setState((prev) => ({
        students: prev.students.map((s) =>
          s.id === studentId ? { ...s, shopBranch } : s
        ),
      }));

      await ctx.repos.gameStates.patchStudentState<StudentCityState>(
        studentId,
        'classcity',
        { shopBranch }
      );
    },

    /**
     * Updates student's shop pastel paint color.
     */
    async changeShopColor(
      studentId: string,
      shopColor: string
    ): Promise<boolean> {
      const state = store.getState();
      if (!ctx.permissions.can('game:configure')) {
        state.pushToast(t('permission.denied'), 'error');
        return false;
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(shopColor.trim())) {
        return false;
      }
      const normalized = shopColor.trim().toUpperCase();

      store.setState((prev) => ({
        students: prev.students.map((s) =>
          s.id === studentId ? { ...s, shopColor: normalized } : s
        ),
      }));

      await ctx.repos.gameStates.patchStudentState<StudentCityState>(
        studentId,
        'classcity',
        { shopColor: normalized }
      );
      return true;
    },

    /**
     * Changes city weather mode ('sunny' | 'rainy' | 'rainbow').
     */
    async setWeatherMode(weatherMode: WeatherMode): Promise<void> {
      const state = store.getState();
      store.setState({ weatherMode });
      await ctx.repos.gameStates.patchClassroomState<ClassroomCityState>(
        state.activeClassroomId,
        'classcity',
        { weatherMode }
      );
    },

    /**
     * Changes patrol vehicle kind ('car' | 'ambulance' | 'ufo').
     */
    async setVehicleKind(vehicleKind: VehicleKind): Promise<void> {
      const state = store.getState();
      store.setState({ vehicleKind });
      await ctx.repos.gameStates.patchClassroomState<ClassroomCityState>(
        state.activeClassroomId,
        'classcity',
        { vehicleKind }
      );
    },

    /**
     * Updates classroom/ecosystem settings (`pointsPerLevel`, `locale`, `lowPowerMode`, `muted`, `brand`).
     * Changing `pointsPerLevel` recalculates all student levels immediately without touching the ledger.
     */
    async updateSettings(cmd: UpdateSettingsCommand): Promise<void> {
      const state = store.getState();
      if (!ctx.permissions.can('game:configure')) {
        state.pushToast(t('permission.denied'), 'error');
        return;
      }

      if (cmd.pointsPerLevel !== undefined) {
        const safePpl = Math.max(1, Math.min(50, Math.floor(cmd.pointsPerLevel)));
        store.setState((prev) => ({
          pointsPerLevel: safePpl,
          students: prev.students.map((s) => ({
            ...s,
            level: levelFromPoints(s.totalPoints, safePpl),
          })),
        }));
        await ctx.repos.gameStates.patchClassroomState<ClassroomCityState>(
          state.activeClassroomId,
          'classcity',
          { pointsPerLevel: safePpl }
        );
      }

      const settingsPatch: Record<string, unknown> = {};
      if (cmd.locale !== undefined) {
        setLocale(cmd.locale);
        store.setState({ locale: cmd.locale });
        settingsPatch.locale = cmd.locale;
      }
      if (cmd.lowPowerMode !== undefined) {
        store.setState({ lowPowerMode: cmd.lowPowerMode });
        settingsPatch.lowPowerMode = cmd.lowPowerMode;
      }
      if (cmd.muted !== undefined) {
        store.setState({ muted: cmd.muted });
        settingsPatch.muted = cmd.muted;
        ctx.bus.publish('AUDIO:MUTE_CHANGED', { muted: cmd.muted });
      }
      if (cmd.brand !== undefined) {
        const nextBrand: TenantBrand = {
          ...store.getState().brand,
          ...cmd.brand,
        };
        applyTheme(nextBrand);
        store.setState({ brand: nextBrand });
        settingsPatch.brand = nextBrand;
      }

      if (Object.keys(settingsPatch).length > 0) {
        await ctx.repos.settings.patchSettings(settingsPatch);
      }
    },

    /**
     * Dev helper: switches subscription tier between Free and Pro at runtime.
     */
    async setSubscriptionTier(tier: Tier): Promise<void> {
      ctx.entitlements.setTier(tier);
      store.setState({ tier });
      await ctx.repos.teachers.updateProfile({ tier });
      await ctx.repos.settings.patchSettings({ devTier: tier });
    },

    /**
     * Applies a remote `LEDGER:POINTS_AWARDED` event (e.g. from ClassArena/ClassFarm or another tab).
     */
    applyRemoteAward(
      event: EcoEvent<'LEDGER:POINTS_AWARDED'>
    ): void {
      const state = store.getState();
      const { tx, totalPoints } = event.payload;
      if (tx.classroomId !== state.activeClassroomId) return;

      const targetStu = state.students.find((s) => s.id === tx.studentId);
      if (!targetStu) return;

      const oldLevel = targetStu.level;
      const newLevel = levelFromPoints(totalPoints, state.pointsPerLevel);
      const nowMs = Date.now();

      store.setState((prev) => {
        const updatedStudents = prev.students.map((s) =>
          s.id === tx.studentId
            ? { ...s, totalPoints, level: newLevel }
            : s
        );
        const nextWonder = updatedStudents.reduce(
          (sum, s) => sum + s.totalPoints,
          0
        );
        return {
          students: updatedStudents,
          wonderProgress: nextWonder,
          lastAwardedStudent: {
            studentId: targetStu.id,
            lotNumber: targetStu.lotNumber,
            delta: tx.delta,
            timestamp: nowMs,
          },
          lastLevelUp:
            newLevel > oldLevel
              ? {
                  studentId: targetStu.id,
                  lotNumber: targetStu.lotNumber,
                  oldLevel,
                  newLevel,
                  timestamp: nowMs,
                }
              : prev.lastLevelUp,
        };
      });
    },

    /**
     * Navigates back to the Ecosystem Hub screen.
     */
    navigateToHub(): void {
      ctx.bus.publish('HUB:NAVIGATE', { target: 'hub' });
      ctx.navigate.toHub();
    },

    /**
     * Resets all ecosystem data back to the deterministic sample seed and reloads Class 5A.
     */
    async resetToSeedData(): Promise<void> {
      const state = store.getState();
      if (!ctx.permissions.can('class:manage')) {
        state.pushToast(t('permission.denied'), 'error');
        return;
      }
      await ctx.repos.resetToSeed();
      const teacher = await ctx.repos.teachers.getProfile();
      ctx.entitlements.setTier(teacher.tier);
      store.setState({ selectedStudentId: null, calledStudentId: null, activeModal: 'none' });
      await this.loadClassroom('class-5a');
      store.getState().pushToast(t('settings.resetSuccess'), 'success');
    },

    /**
     * Imports a validated batch of student roster rows into the active classroom (overwriting existing roster).
     */
    async importRosterRows(
      rows: Array<{ studentCode: number; name: string }>
    ): Promise<boolean> {
      const state = store.getState();
      if (!ctx.permissions.can('roster:write')) {
        state.pushToast(t('permission.denied'), 'error');
        return false;
      }
      const imported = await ctx.repos.students.importBatch(
        state.activeClassroomId,
        rows
      );
      store.setState({ selectedStudentId: null, calledStudentId: null });
      await this.loadClassroom(state.activeClassroomId);
      for (const stu of imported) {
        ctx.bus.publish(
          'ROSTER:STUDENT_UPDATED',
          { student: stu },
          { classroomId: state.activeClassroomId }
        );
      }
      store
        .getState()
        .pushToast(t('importExport.csvSuccess', { count: imported.length }), 'success');
      return true;
    },

    /**
     * Exports a complete `EcosystemBackupEnvelope` JSON object.
     */
    async exportBackup(): Promise<EcosystemBackupEnvelope> {
      return exportEcosystemBackup(ctx.repos);
    },

    /**
     * Validates and restores a full `backup.json` snapshot.
     */
    async importBackup(
      raw: unknown
    ): Promise<
      | { ok: true; backup: EcosystemBackupEnvelope }
      | { ok: false; issues: ValidationIssue[] }
    > {
      const res = await importEcosystemBackup(ctx.repos, raw);
      if (!res.ok) {
        return res;
      }
      ctx.entitlements.setTier(res.backup.data.teacher.tier);
      const firstClassroomId =
        res.backup.data.classrooms[0]?.id ?? 'class-5a';
      store.setState({ selectedStudentId: null, calledStudentId: null });
      await this.loadClassroom(firstClassroomId);
      ctx.bus.publish('CLASSROOM:CHANGED', { classroomId: firstClassroomId });
      store
        .getState()
        .pushToast(t('importExport.backupRestoreSuccess'), 'success');
      return res;
    },

    /**
     * Exports sorted leaderboard CSV string (requires Pro entitlement `classcity.leaderboard_export`).
     */
    exportLeaderboardCsv(): string | null {
      if (!ctx.entitlements.has('classcity.leaderboard_export')) {
        store.setState({ activeModal: 'upgrade_pro' });
        return null;
      }
      const sorted = selectLeaderboard(store.getState().students);
      return serializeLeaderboardCsv(
        sorted.map((s, idx) => ({
          rank: idx + 1,
          studentCode: s.studentCode,
          name: s.name,
          level: s.level,
          totalPoints: s.totalPoints,
        }))
      );
    },

    /**
     * Simulates another game in the Ecosystem (e.g. `classarena` or `classfarm`) awarding points
     * to a student via the shared immutable ledger + `EcosystemEventBus` (`Brief §9`).
     */
    async simulateExternalGameAward(params: {
      gameId: GameId;
      studentId: string;
      delta: number;
      reason: string;
    }): Promise<void> {
      const state = store.getState();
      const awardRes = await ctx.repos.ledger.award({
        studentId: params.studentId,
        classroomId: state.activeClassroomId,
        gameId: params.gameId,
        delta: params.delta,
        reason: params.reason,
        idempotencyKey: makeUuid(),
        actorUserId: state.user.userId,
      });

      ctx.bus.publish(
        'LEDGER:POINTS_AWARDED',
        {
          tx: awardRes.tx,
          totalPoints: awardRes.totalPoints,
        },
        {
          gameId: params.gameId,
          classroomId: state.activeClassroomId,
        }
      );
    },
  };
}

export type ClassCityUseCases = ReturnType<typeof createClassCityUseCases>;
