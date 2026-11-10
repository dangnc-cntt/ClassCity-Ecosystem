import {
  ConflictError,
  ValidationError,
  validateStudentImportRows,
  type AwardPointsInput,
  type AwardPointsResult,
  type RepositoryBundle,
  type VersionedGameState,
} from '../../ports/repositories';
import type {
  AssetMeta,
  ClassroomCore,
  EcosystemSettings,
  GameId,
  PointTransaction,
  StudentCore,
  TeacherProfile,
} from '../../types/models';
import {
  clearEcosystemStorage,
  getStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from './storage';
import {
  buildSeedDataset,
  SEED_AVATAR_IDS,
  SEED_FENCE_ITEMS,
  SEED_PASTEL_COLORS,
  SEED_PET_ITEMS,
  SEED_SHOP_BRANCHES,
  SEED_SIGN_ITEMS,
  SEED_TREE_ITEMS,
  type SeedClassroomCityData,
  type SeedDataset,
  type SeedStudentCityData,
} from './seed';

export interface KeyValueDriver {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  clear(): void;
}

export function createLocalStorageDriver(): KeyValueDriver {
  return {
    get<T>(key: string): T | null {
      const env = getStorageItem<T>(key);
      return env ? env.data : null;
    },
    set<T>(key: string, value: T): void {
      setStorageItem(key, value, 1);
    },
    clear(): void {
      clearEcosystemStorage();
    },
  };
}

export function seedDriverIfNeeded(driver: KeyValueDriver, seed = 20261109): void {
  const existing = driver.get<ClassroomCore[]>(STORAGE_KEYS.classrooms);
  if (existing && existing.length > 0) {
    return;
  }
  applySeedToDriver(driver, buildSeedDataset(seed));
}

export function applySeedToDriver(driver: KeyValueDriver, dataset: SeedDataset): void {
  driver.set(STORAGE_KEYS.teachers, dataset.teachers);
  driver.set(STORAGE_KEYS.classrooms, dataset.classrooms);
  driver.set(STORAGE_KEYS.students, dataset.students);
  driver.set(STORAGE_KEYS.ledger, dataset.ledger);
  driver.set(STORAGE_KEYS.assetsCatalog, dataset.assetsCatalog);
  driver.set(STORAGE_KEYS.settings, dataset.settings);

  const classCityClassroomMap: Record<string, VersionedGameState<SeedClassroomCityData>> = {};
  for (const [compositeKey, state] of Object.entries(dataset.classroomStates)) {
    const [classroomId] = compositeKey.split(':');
    if (classroomId) {
      classCityClassroomMap[classroomId] = state;
    }
  }
  driver.set(STORAGE_KEYS.classroomState('classcity'), classCityClassroomMap);

  const classCityStudentMap: Record<string, VersionedGameState<SeedStudentCityData>> = {};
  for (const [compositeKey, state] of Object.entries(dataset.studentStates)) {
    const [studentId] = compositeKey.split(':');
    if (studentId) {
      classCityStudentMap[studentId] = state;
    }
  }
  driver.set(STORAGE_KEYS.studentState('classcity'), classCityStudentMap);
}

export function ensureSeedData(seed = 20261109): void {
  const driver = createLocalStorageDriver();
  seedDriverIfNeeded(driver, seed);
}

export function resetToSeedData(seed = 20261109): void {
  const driver = createLocalStorageDriver();
  driver.clear();
  applySeedToDriver(driver, buildSeedDataset(seed));
}

function makeTxId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRepositoryBundleFromDriver(
  driver: KeyValueDriver,
  options?: { autoSeed?: boolean; seed?: number }
): RepositoryBundle {
  if (options?.autoSeed ?? true) {
    seedDriverIfNeeded(driver, options?.seed ?? 20261109);
  }

  const readTeachers = (): TeacherProfile[] =>
    driver.get<TeacherProfile[]>(STORAGE_KEYS.teachers) ?? [];

  const writeTeachers = (items: TeacherProfile[]): void =>
    driver.set(STORAGE_KEYS.teachers, items);

  const readClassrooms = (): ClassroomCore[] =>
    driver.get<ClassroomCore[]>(STORAGE_KEYS.classrooms) ?? [];

  const writeClassrooms = (items: ClassroomCore[]): void =>
    driver.set(STORAGE_KEYS.classrooms, items);

  const readStudents = (): StudentCore[] =>
    driver.get<StudentCore[]>(STORAGE_KEYS.students) ?? [];

  const writeStudents = (items: StudentCore[]): void =>
    driver.set(STORAGE_KEYS.students, items);

  const readLedger = (): PointTransaction[] =>
    driver.get<PointTransaction[]>(STORAGE_KEYS.ledger) ?? [];

  const writeLedger = (items: PointTransaction[]): void =>
    driver.set(STORAGE_KEYS.ledger, items);

  const readAssets = (): AssetMeta[] =>
    driver.get<AssetMeta[]>(STORAGE_KEYS.assetsCatalog) ?? [];

  const readClassroomStateMap = <T>(
    gameId: GameId
  ): Record<string, VersionedGameState<T>> =>
    driver.get<Record<string, VersionedGameState<T>>>(
      STORAGE_KEYS.classroomState(gameId)
    ) ?? {};

  const writeClassroomStateMap = <T>(
    gameId: GameId,
    map: Record<string, VersionedGameState<T>>
  ): void => driver.set(STORAGE_KEYS.classroomState(gameId), map);

  const readStudentStateMap = <T>(
    gameId: GameId
  ): Record<string, VersionedGameState<T>> =>
    driver.get<Record<string, VersionedGameState<T>>>(
      STORAGE_KEYS.studentState(gameId)
    ) ?? {};

  const writeStudentStateMap = <T>(
    gameId: GameId,
    map: Record<string, VersionedGameState<T>>
  ): void => driver.set(STORAGE_KEYS.studentState(gameId), map);

  return {
    teachers: {
      async getProfile(): Promise<TeacherProfile> {
        const teachers = readTeachers();
        if (teachers[0]) return teachers[0];
        const fallback: TeacherProfile = {
          id: 'teacher-local',
          tenantId: 'local',
          name: 'Cô Nguyễn Thu Hà',
          email: 'teacher@classcity.local',
          tier: 'free',
        };
        writeTeachers([fallback]);
        return fallback;
      },
      async updateProfile(patch): Promise<TeacherProfile> {
        const teachers = readTeachers();
        const current = await this.getProfile();
        const updated: TeacherProfile = {
          ...current,
          ...patch,
          id: current.id,
          tenantId: current.tenantId,
        };
        teachers[0] = updated;
        writeTeachers(teachers);
        return updated;
      },
    },

    classrooms: {
      async list(): Promise<ClassroomCore[]> {
        return readClassrooms().filter((c) => !c.archivedAt);
      },
      async get(id: string): Promise<ClassroomCore | null> {
        return readClassrooms().find((c) => c.id === id) ?? null;
      },
      async save(classroom: ClassroomCore): Promise<ClassroomCore> {
        const list = readClassrooms();
        const idx = list.findIndex((c) => c.id === classroom.id);
        const normalized: ClassroomCore = {
          ...classroom,
          tenantId: classroom.tenantId || 'local',
        };
        if (idx >= 0) {
          list[idx] = normalized;
        } else {
          list.push(normalized);
        }
        writeClassrooms(list);
        return normalized;
      },
      async archive(id: string): Promise<void> {
        const list = readClassrooms();
        const idx = list.findIndex((c) => c.id === id);
        if (idx >= 0 && list[idx]) {
          list[idx] = {
            ...list[idx],
            archivedAt: new Date().toISOString(),
          };
          writeClassrooms(list);
        }
      },
    },

    students: {
      async listByClassroom(classroomId: string): Promise<StudentCore[]> {
        return readStudents()
          .filter((s) => s.classroomId === classroomId)
          .sort((a, b) => a.studentCode - b.studentCode);
      },

      async importBatch(
        classroomId: string,
        rows: Array<{ studentCode: number; name: string }>
      ): Promise<StudentCore[]> {
        const issues = validateStudentImportRows(rows);
        if (issues.length > 0) {
          throw new ValidationError('Dữ liệu danh sách học sinh không hợp lệ.', issues);
        }

        const allStudents = readStudents();
        const otherClassStudents = allStudents.filter((s) => s.classroomId !== classroomId);
        const oldClassStudentIds = new Set(
          allStudents.filter((s) => s.classroomId === classroomId).map((s) => s.id)
        );

        // Remove old ledger entries for replaced classroom roster
        const remainingLedger = readLedger().filter(
          (tx) => tx.classroomId !== classroomId && !oldClassStudentIds.has(tx.studentId)
        );
        writeLedger(remainingLedger);

        const studentStateMap = readStudentStateMap<SeedStudentCityData>('classcity');
        for (const oldId of oldClassStudentIds) {
          delete studentStateMap[oldId];
        }

        const imported: StudentCore[] = rows
          .slice()
          .sort((a, b) => a.studentCode - b.studentCode)
          .map((row, index) => {
            const code = row.studentCode;
            const studentId = `${classroomId}-stu-${String(code).padStart(2, '0')}`;
            const avatarId = SEED_AVATAR_IDS[index % SEED_AVATAR_IDS.length];
            const branch = SEED_SHOP_BRANCHES[index % SEED_SHOP_BRANCHES.length];
            const color = SEED_PASTEL_COLORS[index % SEED_PASTEL_COLORS.length];
            const fence = SEED_FENCE_ITEMS[1 + (index % (SEED_FENCE_ITEMS.length - 1))]!;
            const tree = SEED_TREE_ITEMS[1 + ((index * 3 + 1) % (SEED_TREE_ITEMS.length - 1))]!;
            const pet = SEED_PET_ITEMS[(index + 1) % SEED_PET_ITEMS.length]!;
            const sign = SEED_SIGN_ITEMS[1 + ((index * 2) % (SEED_SIGN_ITEMS.length - 1))]!;

            studentStateMap[studentId] = {
              schemaVersion: 1,
              rev: 1,
              data: {
                lotNumber: code,
                shopBranch: branch,
                shopColor: color,
                lotItems: { fence, tree, pet, sign },
                perks: [],
              },
            };

            return {
              id: studentId,
              tenantId: 'local',
              classroomId,
              studentCode: code,
              name: row.name.trim(),
              totalPoints: 0,
              walletCoins: 0,
              equippedAvatarId: avatarId,
              unlockedAssetIds: [...SEED_AVATAR_IDS],
            };
          });

        writeStudentStateMap('classcity', studentStateMap);
        writeStudents([...otherClassStudents, ...imported]);

        // Reset classroom wonderProgress to 0 on fresh roster import
        const classStateMap = readClassroomStateMap<SeedClassroomCityData>('classcity');
        const currentClassState = classStateMap[classroomId];
        if (currentClassState) {
          classStateMap[classroomId] = {
            schemaVersion: currentClassState.schemaVersion,
            rev: currentClassState.rev + 1,
            data: {
              ...currentClassState.data,
              wonderProgress: 0,
              calledHistory: {},
            },
          };
          writeClassroomStateMap('classcity', classStateMap);
        }

        return imported;
      },

      async setEquippedAvatar(studentId: string, assetId: string): Promise<StudentCore> {
        const list = readStudents();
        const idx = list.findIndex((s) => s.id === studentId);
        if (idx < 0 || !list[idx]) {
          throw new ValidationError(`Không tìm thấy học sinh "${studentId}".`, [
            { field: 'studentId', message: 'Học sinh không tồn tại.' },
          ]);
        }
        const updated: StudentCore = {
          ...list[idx],
          equippedAvatarId: assetId,
        };
        list[idx] = updated;
        writeStudents(list);
        return updated;
      },

      async update(studentId: string, patch): Promise<StudentCore> {
        const list = readStudents();
        const idx = list.findIndex((s) => s.id === studentId);
        if (idx < 0 || !list[idx]) {
          throw new ValidationError(`Không tìm thấy học sinh "${studentId}".`, [
            { field: 'studentId', message: 'Học sinh không tồn tại.' },
          ]);
        }
        if (patch.name !== undefined) {
          const trimmed = patch.name.trim();
          if (trimmed.length === 0 || trimmed.length > 40) {
            throw new ValidationError('Tên học sinh phải từ 1 đến 40 ký tự.', [
              { field: 'name', message: 'Tên học sinh phải từ 1 đến 40 ký tự.' },
            ]);
          }
        }
        const current = list[idx];
        const updated: StudentCore = {
          ...current,
          ...patch,
          id: current.id,
          tenantId: current.tenantId,
          totalPoints: current.totalPoints,
        };
        list[idx] = updated;
        writeStudents(list);
        return updated;
      },
    },

    ledger: {
      async award(input: AwardPointsInput): Promise<AwardPointsResult> {
        const ledger = readLedger();
        const students = readStudents();
        const studentIdx = students.findIndex((s) => s.id === input.studentId);
        if (studentIdx < 0 || !students[studentIdx]) {
          throw new ValidationError(`Không tìm thấy học sinh "${input.studentId}".`, [
            { field: 'studentId', message: 'Học sinh không tồn tại.' },
          ]);
        }
        const student = students[studentIdx];

        // Idempotency check: same studentId + idempotencyKey returns existing transaction
        const existingTx = ledger.find(
          (tx) =>
            tx.studentId === input.studentId &&
            tx.idempotencyKey === input.idempotencyKey
        );
        if (existingTx) {
          return {
            tx: existingTx,
            totalPoints: student.totalPoints,
          };
        }

        const currentPoints = student.totalPoints;
        const nextTotalPoints = Math.max(0, currentPoints + input.delta);
        const effectiveDelta = nextTotalPoints - currentPoints;

        const tx: PointTransaction = {
          id: makeTxId(),
          tenantId: student.tenantId || 'local',
          studentId: input.studentId,
          classroomId: input.classroomId,
          gameId: input.gameId,
          delta: effectiveDelta,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
          createdAt: new Date().toISOString(),
          actorUserId: input.actorUserId || 'local-teacher',
        };

        ledger.push(tx);
        writeLedger(ledger);

        students[studentIdx] = {
          ...student,
          totalPoints: nextTotalPoints,
          walletCoins: Math.max(0, student.walletCoins + Math.max(0, effectiveDelta)),
        };
        writeStudents(students);

        return {
          tx,
          totalPoints: nextTotalPoints,
        };
      },

      async history(studentId: string, limit = 50): Promise<PointTransaction[]> {
        const all = readLedger().filter((tx) => tx.studentId === studentId);
        return all.slice(-limit).reverse();
      },

      async totals(classroomId: string): Promise<Record<string, number>> {
        const classStudents = readStudents().filter(
          (s) => s.classroomId === classroomId
        );
        const result: Record<string, number> = {};
        for (const s of classStudents) {
          result[s.id] = 0;
        }
        const classTxs = readLedger().filter(
          (tx) => tx.classroomId === classroomId
        );
        for (const tx of classTxs) {
          result[tx.studentId] = (result[tx.studentId] ?? 0) + tx.delta;
        }
        for (const studentId of Object.keys(result)) {
          result[studentId] = Math.max(0, result[studentId] ?? 0);
        }
        return result;
      },
    },

    gameStates: {
      async getClassroomState<T = Record<string, unknown>>(
        classroomId: string,
        gameId: GameId
      ): Promise<VersionedGameState<T> | null> {
        const map = readClassroomStateMap<T>(gameId);
        return map[classroomId] ?? null;
      },

      async patchClassroomState<T = Record<string, unknown>>(
        classroomId: string,
        gameId: GameId,
        patch: Partial<T>,
        expectedRev?: number
      ): Promise<VersionedGameState<T>> {
        const map = readClassroomStateMap<T>(gameId);
        const current = map[classroomId];

        if (expectedRev !== undefined) {
          const actualRev = current?.rev ?? 0;
          if (actualRev !== expectedRev) {
            throw new ConflictError(classroomId, expectedRev, actualRev);
          }
        }

        const nextState: VersionedGameState<T> = {
          schemaVersion: current?.schemaVersion ?? 1,
          rev: (current?.rev ?? 0) + 1,
          data: {
            ...(current?.data ?? ({} as T)),
            ...patch,
          },
        };
        map[classroomId] = nextState;
        writeClassroomStateMap(gameId, map);
        return nextState;
      },

      async getStudentStates<T = Record<string, unknown>>(
        classroomId: string,
        gameId: GameId
      ): Promise<Record<string, VersionedGameState<T>>> {
        const classStudentIds = new Set(
          readStudents()
            .filter((s) => s.classroomId === classroomId)
            .map((s) => s.id)
        );
        const map = readStudentStateMap<T>(gameId);
        const filtered: Record<string, VersionedGameState<T>> = {};
        for (const [studentId, state] of Object.entries(map)) {
          if (classStudentIds.has(studentId)) {
            filtered[studentId] = state;
          }
        }
        return filtered;
      },

      async patchStudentState<T = Record<string, unknown>>(
        studentId: string,
        gameId: GameId,
        patch: Partial<T>,
        expectedRev?: number
      ): Promise<VersionedGameState<T>> {
        const map = readStudentStateMap<T>(gameId);
        const current = map[studentId];

        if (expectedRev !== undefined) {
          const actualRev = current?.rev ?? 0;
          if (actualRev !== expectedRev) {
            throw new ConflictError(studentId, expectedRev, actualRev);
          }
        }

        const nextState: VersionedGameState<T> = {
          schemaVersion: current?.schemaVersion ?? 1,
          rev: (current?.rev ?? 0) + 1,
          data: {
            ...(current?.data ?? ({} as T)),
            ...patch,
          },
        };
        map[studentId] = nextState;
        writeStudentStateMap(gameId, map);
        return nextState;
      },
    },

    assetsCatalog: {
      async list(filter): Promise<AssetMeta[]> {
        return readAssets().filter((asset) => {
          if (filter?.category && asset.category !== filter.category) {
            return false;
          }
          if (filter?.gameId) {
            if (
              asset.compatibleGames !== '*' &&
              !asset.compatibleGames.includes(filter.gameId)
            ) {
              return false;
            }
          }
          return true;
        });
      },
      async get(id: string): Promise<AssetMeta | null> {
        return readAssets().find((a) => a.id === id) ?? null;
      },
    },

    settings: {
      async getSettings(): Promise<EcosystemSettings> {
        const existing = driver.get<EcosystemSettings>(STORAGE_KEYS.settings);
        if (existing) return existing;
        const fallback = buildSeedDataset().settings;
        driver.set(STORAGE_KEYS.settings, fallback);
        return fallback;
      },
      async patchSettings(patch: Partial<EcosystemSettings>): Promise<EcosystemSettings> {
        const current = await this.getSettings();
        const updated: EcosystemSettings = {
          ...current,
          ...patch,
          brand: patch.brand ? { ...current.brand, ...patch.brand } : current.brand,
        };
        driver.set(STORAGE_KEYS.settings, updated);
        return updated;
      },
    },

    async restoreSnapshot(snapshot): Promise<void> {
      writeTeachers([snapshot.teacher]);
      writeClassrooms(snapshot.classrooms);
      writeStudents(snapshot.students);
      writeLedger(snapshot.ledger);
      writeClassroomStateMap('classcity', snapshot.classroomStates);
      writeStudentStateMap('classcity', snapshot.studentStates);
    },

    async resetToSeed(): Promise<void> {
      driver.clear();
      applySeedToDriver(driver, buildSeedDataset(options?.seed ?? 20261109));
    },
  };
}

export function createLocalStorageAdapter(options?: {
  autoSeed?: boolean;
  seed?: number;
}): RepositoryBundle {
  const driver = createLocalStorageDriver();
  return createRepositoryBundleFromDriver(driver, options);
}
