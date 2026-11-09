import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictError,
  ValidationError,
  type RepositoryBundle,
} from '../ports/repositories';
import { createInMemoryAdapter } from '../adapters/memory';
import {
  createLocalStorageAdapter,
  resetToSeedData,
} from '../adapters/localStorage/repositories';
import {
  getStorageItem,
  onStorageQuotaError,
  setStorageItem,
} from '../adapters/localStorage/storage';
import { createRepositories } from '../createRepositories';
import { EcosystemEventBus } from '../eventBus';
import { createEntitlementService } from '../entitlements';
import { createPermissionService } from '../permissions';
import { getLocale, registerMessages, setLocale, t } from '../i18n';
import { createTelemetry } from '../ports/telemetry';
import {
  exportEcosystemBackup,
  importEcosystemBackup,
  parseStudentRosterCsv,
  sanitizeCsvCell,
  serializeLeaderboardCsv,
  validateEcosystemBackup,
} from '../backup';
import { createAssetService } from '../assets/assetService';
import { createSoundEffects } from '../audio/soundEffects';
import type { Object3D } from 'three';

class MockWebStorage implements Storage {
  private readonly map = new Map<string, string>();
  public failOnSet = false;

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failOnSet) {
      const err = new Error('QuotaExceededError');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.map.set(key, value);
  }
}

const mockStorage = new MockWebStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true,
});

describe.each([
  [
    'InMemoryAdapter',
    (): RepositoryBundle => createRepositories(createInMemoryAdapter({ seed: 20261109 })),
  ],
  [
    'LocalStorageAdapter',
    (): RepositoryBundle => {
      mockStorage.clear();
      mockStorage.failOnSet = false;
      return createRepositories(createLocalStorageAdapter({ seed: 20261109 }));
    },
  ],
])('Repository Contract Tests (%s)', (_adapterName, createBundle) => {
  let repos: RepositoryBundle;

  beforeEach(() => {
    repos = createBundle();
  });

  it('seeds 1 teacher, 2 classrooms (36 + 24 students), distinct names, and prefetch-ready level 19 students', async () => {
    const teacher = await repos.teachers.getProfile();
    expect(teacher.tenantId).toBe('local');
    expect(teacher.tier).toBe('free');

    const classrooms = await repos.classrooms.list();
    expect(classrooms).toHaveLength(2);

    const students5A = await repos.students.listByClassroom('class-5a');
    const students5B = await repos.students.listByClassroom('class-5b');
    expect(students5A).toHaveLength(36);
    expect(students5B).toHaveLength(24);

    // Distinct Vietnamese names across all 60 students
    const allNames = new Set([...students5A, ...students5B].map((s) => s.name));
    expect(allNames.size).toBe(60);

    // Totals match seeded student.totalPoints
    const totals5A = await repos.ledger.totals('class-5a');
    for (const stu of students5A) {
      expect(totals5A[stu.id]).toBe(stu.totalPoints);
    }

    // At least 2 students in 5A at level 19 missing <= 2 points to level 20 (93 or 94 points when ppl=5)
    const prefetchCandidates = students5A.filter(
      (s) => s.totalPoints >= 93 && s.totalPoints <= 94
    );
    expect(prefetchCandidates.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces idempotency on ledger.award and keeps totals == sum(delta) with floor 0', async () => {
    const students = await repos.students.listByClassroom('class-5a');
    const target = students[0]!;
    const initialPoints = target.totalPoints;

    const first = await repos.ledger.award({
      studentId: target.id,
      classroomId: 'class-5a',
      gameId: 'classcity',
      delta: 5,
      reason: 'answer_correct',
      idempotencyKey: 'idem-key-001',
      actorUserId: 'local-teacher',
    });
    expect(first.totalPoints).toBe(initialPoints + 5);

    // Duplicate call with same idempotencyKey must NOT add points again
    const duplicate = await repos.ledger.award({
      studentId: target.id,
      classroomId: 'class-5a',
      gameId: 'classcity',
      delta: 5,
      reason: 'answer_correct',
      idempotencyKey: 'idem-key-001',
      actorUserId: 'local-teacher',
    });
    expect(duplicate.tx.id).toBe(first.tx.id);
    expect(duplicate.totalPoints).toBe(initialPoints + 5);

    // Subtracting more than current points floors at 0 and records clamped effective delta
    const floored = await repos.ledger.award({
      studentId: target.id,
      classroomId: 'class-5a',
      gameId: 'classcity',
      delta: -(initialPoints + 50),
      reason: 'reminder',
      idempotencyKey: 'idem-key-002',
      actorUserId: 'local-teacher',
    });
    expect(floored.totalPoints).toBe(0);

    const history = await repos.ledger.history(target.id, 100);
    const sumDelta = history.reduce((acc, tx) => acc + tx.delta, 0);
    const totals = await repos.ledger.totals('class-5a');

    expect(sumDelta).toBe(0);
    expect(totals[target.id]).toBe(0);
  });

  it('enforces optimistic concurrency rev on patchClassroomState and patchStudentState', async () => {
    const initial = await repos.gameStates.getClassroomState('class-5a', 'classcity');
    expect(initial).not.toBeNull();
    const initialRev = initial!.rev;

    const updated = await repos.gameStates.patchClassroomState(
      'class-5a',
      'classcity',
      { weatherMode: 'rainbow' },
      initialRev
    );
    expect(updated.rev).toBe(initialRev + 1);
    expect(updated.data.weatherMode).toBe('rainbow');

    // Using stale expectedRev must throw ConflictError
    await expect(
      repos.gameStates.patchClassroomState(
        'class-5a',
        'classcity',
        { weatherMode: 'rainy' },
        initialRev
      )
    ).rejects.toBeInstanceOf(ConflictError);

    // Same for student state
    const stuStates = await repos.gameStates.getStudentStates('class-5a', 'classcity');
    const firstStuId = Object.keys(stuStates)[0]!;
    const stuInitialRev = stuStates[firstStuId]!.rev;

    const stuUpdated = await repos.gameStates.patchStudentState(
      firstStuId,
      'classcity',
      { shopColor: '#BFDBFE' },
      stuInitialRev
    );
    expect(stuUpdated.rev).toBe(stuInitialRev + 1);

    await expect(
      repos.gameStates.patchStudentState(
        firstStuId,
        'classcity',
        { shopColor: '#FECACA' },
        stuInitialRev
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('strictly validates importBatch rows and imports valid rosters cleanly', async () => {
    // 1. Empty rows
    await expect(repos.students.importBatch('class-5a', [])).rejects.toBeInstanceOf(
      ValidationError
    );

    // 2. Duplicate studentCode and invalid name length
    await expect(
      repos.students.importBatch('class-5a', [
        { studentCode: 1, name: 'Nguyễn Văn A' },
        { studentCode: 1, name: 'Trần Thị B' },
        { studentCode: 45, name: '' },
      ])
    ).rejects.toBeInstanceOf(ValidationError);

    // 3. Over 40 students
    const tooMany = Array.from({ length: 41 }, (_, idx) => ({
      studentCode: idx + 1,
      name: `Học sinh ${idx + 1}`,
    }));
    await expect(repos.students.importBatch('class-5a', tooMany)).rejects.toBeInstanceOf(
      ValidationError
    );

    // 4. Valid batch import
    const validRows = [
      { studentCode: 2, name: 'Trần Minh Khôi' },
      { studentCode: 1, name: 'Nguyễn Bảo Ngọc' },
    ];
    const imported = await repos.students.importBatch('class-5a', validRows);
    expect(imported).toHaveLength(2);
    expect(imported[0]?.studentCode).toBe(1);
    expect(imported[0]?.name).toBe('Nguyễn Bảo Ngọc');
    expect(imported[0]?.totalPoints).toBe(0);
  });

  it('exports and restores ecosystem backup JSON accurately', async () => {
    const backup = await exportEcosystemBackup(repos);
    expect(backup.schemaVersion).toBe(1);
    expect(backup.data.classrooms).toHaveLength(2);

    const check = validateEcosystemBackup(backup);
    expect(check.ok).toBe(true);

    // Modify classroom roster then restore from backup
    await repos.students.importBatch('class-5a', [
      { studentCode: 1, name: 'Tạm Thời' },
    ]);
    expect(await repos.students.listByClassroom('class-5a')).toHaveLength(1);

    const restored = await importEcosystemBackup(repos, backup);
    expect(restored.ok).toBe(true);
    expect(await repos.students.listByClassroom('class-5a')).toHaveLength(36);
  });
});

describe('Platform Storage, Migrations, Bus, Entitlements, Permissions & Backup', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.failOnSet = false;
  });

  it('runs storage schemaVersion migrations and handles quota errors gracefully', () => {
    setStorageItem('eco:v1:test_mig', { count: 1 }, 1);

    const migrated = getStorageItem<{ count: number; upgraded: boolean }>(
      'eco:v1:test_mig',
      {
        targetVersion: 3,
        migrations: {
          1: (old) => ({ ...(old as { count: number }), count: 10 }),
          2: (old) => ({ ...(old as { count: number }), upgraded: true }),
        },
      }
    );

    expect(migrated?.schemaVersion).toBe(3);
    expect(migrated?.data).toEqual({ count: 10, upgraded: true });

    // Quota error handling
    const quotaSpy = vi.fn();
    const unsub = onStorageQuotaError(quotaSpy);
    mockStorage.failOnSet = true;

    const ok = setStorageItem('eco:v1:quota_test', { hello: 'world' }, 1);
    expect(ok).toBe(false);
    expect(quotaSpy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it('resets localStorage seed data cleanly via resetToSeedData', async () => {
    resetToSeedData(20261109);
    const repos = createLocalStorageAdapter();
    expect(await repos.students.listByClassroom('class-5a')).toHaveLength(36);
  });

  it('deduplicates events by eventId and cleans up on dispose in EcosystemEventBus', () => {
    const bus = new EcosystemEventBus({ enableBroadcast: false });
    const received: string[] = [];

    bus.on('CLASSROOM:CHANGED', (evt) => {
      received.push(evt.payload.classroomId);
    });

    const evt = bus.publish(
      'CLASSROOM:CHANGED',
      { classroomId: 'class-5b' },
      { eventId: 'fixed-evt-1' }
    );
    // Re-emitting same eventId must be ignored
    bus.emit(evt);
    expect(received).toEqual(['class-5b']);

    bus.dispose();
    bus.publish('CLASSROOM:CHANGED', { classroomId: 'class-5a' });
    expect(received).toEqual(['class-5b']);
  });

  it('checks entitlements and role permissions via single mapping tables', () => {
    const ent = createEntitlementService('free');
    expect(ent.has('classcity.single_class')).toBe(true);
    expect(ent.has('classcity.multi_class')).toBe(false);
    expect(ent.limit('max_classrooms')).toBe(1);
    expect(ent.limit('max_students')).toBe(40);

    ent.setTier('pro');
    expect(ent.has('classcity.multi_class')).toBe(true);
    expect(ent.has('classcity.leaderboard_export')).toBe(true);
    expect(ent.limit('max_classrooms')).toBe(50);

    const teacherPerms = createPermissionService('teacher');
    expect(teacherPerms.can('ledger:write')).toBe(true);

    const studentPerms = createPermissionService('student', { allowAllLocal: false });
    expect(studentPerms.can('roster:read')).toBe(true);
    expect(studentPerms.can('ledger:write')).toBe(false);
  });

  it('interpolates i18n keys, sanitizes telemetry PII, and protects CSV against formula injection', () => {
    registerMessages('vi', { 'greet.student': 'Xin chào {name}!' });
    setLocale('vi');
    expect(getLocale()).toBe('vi');
    expect(t('greet.student', { name: 'Minh Anh' })).toBe('Xin chào Minh Anh!');

    const tracked: Array<{ name: string; props?: Record<string, unknown> }> = [];
    const telemetry = createTelemetry({
      enabled: false,
      onTrack: (name, props) => tracked.push({ name, props }),
    });
    telemetry.track('student_called', {
      studentId: 'stu-01',
      name: 'Bí Mật',
      studentName: 'Bí Mật',
    });
    expect(tracked[0]?.props).toEqual({ studentId: 'stu-01' });

    // CSV parsing & injection protection
    const validCsv = 'studentCode,name\n1,Nguyễn Minh Anh\n2,Trần Gia Bảo\n';
    const parsed = parseStudentRosterCsv(validCsv);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.rows).toHaveLength(2);
    }

    const invalidCsv = 'studentCode,name\n1,Nguyễn Minh Anh\n1,Trùng Mã\n99,\n';
    const badParsed = parseStudentRosterCsv(invalidCsv);
    expect(badParsed.ok).toBe(false);
    if (!badParsed.ok) {
      expect(badParsed.issues.some((i) => i.row === 3)).toBe(true);
      expect(badParsed.issues.some((i) => i.row === 4)).toBe(true);
    }

    expect(sanitizeCsvCell('=cmd|"/c calc"!A0')).toBe('"\'=cmd|""/c calc""!A0"');
    const csvOut = serializeLeaderboardCsv([
      {
        rank: 1,
        studentCode: 1,
        name: '=SUM(A1:A2)',
        level: 5,
        totalPoints: 22,
      },
    ]);
    expect(csvOut).toContain("'=SUM(A1:A2)");
  });

  it('dedupes requests, handles 404/error fallback, and disposes in AssetService', async () => {
    let loaderCallCount = 0;
    const missingEvents: string[] = [];
    const telemetry = createTelemetry({
      enabled: false,
      onTrack: (name, props) => {
        if (name === 'asset_missing' && props?.assetId) {
          missingEvents.push(String(props.assetId));
        }
      },
    });

    const disposeGeomSpy = vi.fn();
    const fakeScene = {
      traverse: (cb: (obj: unknown) => void) => {
        cb({ geometry: { dispose: disposeGeomSpy } });
      },
    } as unknown as Object3D;

    const service = createAssetService({
      telemetry,
      ttlMs: 10,
      customLoader: async (_url, assetId) => {
        loaderCallCount += 1;
        if (assetId === 'missing_glb') {
          throw new Error('404 Not Found');
        }
        await new Promise((r) => setTimeout(r, 5));
        return { scene: fakeScene, estimatedBytes: 1024 };
      },
    });

    // Deduplicate concurrent requests for the same asset
    const [a1, a2] = await Promise.all([
      service.get('avatar_knight'),
      service.get('avatar_knight'),
    ]);
    expect(a1).not.toBeNull();
    expect(a1).toBe(a2);
    expect(loaderCallCount).toBe(1);

    // 404 returns null without throwing and tracks asset_missing
    const missing = await service.get('missing_glb');
    expect(missing).toBeNull();
    expect(missingEvents).toContain('missing_glb');

    service.dispose();
    expect(disposeGeomSpy).toHaveBeenCalledTimes(1);
    expect(service.stats().loadedCount).toBe(0);
  });

  it('synchronizes mute state over EcosystemEventBus in SoundEffectsService', async () => {
    const bus = new EcosystemEventBus({ enableBroadcast: false });
    const sfx = createSoundEffects({ initialMuted: false, bus });
    expect(sfx.isMuted).toBe(false);

    bus.publish('AUDIO:MUTE_CHANGED', { muted: true });
    expect(sfx.isMuted).toBe(true);

    sfx.setMuted(false);
    expect(sfx.isMuted).toBe(false);

    await sfx.dispose();
    bus.dispose();
  });
});
