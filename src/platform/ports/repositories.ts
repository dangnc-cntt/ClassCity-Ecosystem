import type {
  AssetMeta,
  ClassroomCore,
  EcosystemSettings,
  GameId,
  PointTransaction,
  StudentCore,
  TeacherProfile,
} from '../types/models';

export class ConflictError extends Error {
  readonly entityId: string;
  readonly expectedRev: number;
  readonly actualRev: number;

  constructor(entityId: string, expectedRev: number, actualRev: number) {
    super(
      `Optimistic concurrency conflict on "${entityId}": expected rev ${expectedRev}, got ${actualRev}`
    );
    this.name = 'ConflictError';
    this.entityId = entityId;
    this.expectedRev = expectedRev;
    this.actualRev = actualRev;
  }
}

export interface ValidationIssue {
  row?: number;
  field: string;
  message: string;
}

export class ValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

export function validateStudentImportRows(
  rows: Array<{ studentCode: number; name: string }>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(rows) || rows.length === 0) {
    issues.push({
      field: 'rows',
      message: 'Danh sách học sinh không được để trống.',
    });
    return issues;
  }

  if (rows.length > 40) {
    issues.push({
      field: 'rows',
      message: `Tối đa 40 học sinh mỗi lớp (hiện có ${rows.length}).`,
    });
  }

  const seenCodes = new Set<number>();

  rows.forEach((row, index) => {
    const rowNum = index + 1;
    const code = row?.studentCode;
    const rawName = typeof row?.name === 'string' ? row.name.trim() : '';

    if (
      typeof code !== 'number' ||
      !Number.isInteger(code) ||
      code < 1 ||
      code > 40
    ) {
      issues.push({
        row: rowNum,
        field: 'studentCode',
        message: 'Mã số học sinh phải là số nguyên từ 1 đến 40.',
      });
    } else if (seenCodes.has(code)) {
      issues.push({
        row: rowNum,
        field: 'studentCode',
        message: `Trùng mã số học sinh ${code}.`,
      });
    } else {
      seenCodes.add(code);
    }

    if (rawName.length === 0) {
      issues.push({
        row: rowNum,
        field: 'name',
        message: 'Tên học sinh không được để trống.',
      });
    } else if (rawName.length > 40) {
      issues.push({
        row: rowNum,
        field: 'name',
        message: 'Tên học sinh không được vượt quá 40 ký tự.',
      });
    }
  });

  return issues;
}

export interface VersionedGameState<T = Record<string, unknown>> {
  schemaVersion: number;
  rev: number;
  data: T;
}

export interface AwardPointsInput {
  studentId: string;
  classroomId: string;
  gameId: GameId;
  delta: number;
  reason: string;
  idempotencyKey: string;
  actorUserId: string;
}

export interface AwardPointsResult {
  tx: PointTransaction;
  totalPoints: number;
}

export interface ClassroomRepository {
  list(): Promise<ClassroomCore[]>;
  get(id: string): Promise<ClassroomCore | null>;
  save(classroom: ClassroomCore): Promise<ClassroomCore>;
  archive(id: string): Promise<void>;
}

export interface StudentRepository {
  listByClassroom(classroomId: string): Promise<StudentCore[]>;
  importBatch(
    classroomId: string,
    rows: Array<{ studentCode: number; name: string }>
  ): Promise<StudentCore[]>;
  setEquippedAvatar(studentId: string, assetId: string): Promise<StudentCore>;
  update(studentId: string, patch: Partial<Omit<StudentCore, 'id' | 'tenantId' | 'totalPoints'>>): Promise<StudentCore>;
}

export interface LedgerRepository {
  award(input: AwardPointsInput): Promise<AwardPointsResult>;
  history(studentId: string, limit?: number): Promise<PointTransaction[]>;
  totals(classroomId: string): Promise<Record<string, number>>;
}

export interface GameStateRepository {
  getClassroomState<T = Record<string, unknown>>(
    classroomId: string,
    gameId: GameId
  ): Promise<VersionedGameState<T> | null>;
  patchClassroomState<T = Record<string, unknown>>(
    classroomId: string,
    gameId: GameId,
    patch: Partial<T>,
    expectedRev?: number
  ): Promise<VersionedGameState<T>>;
  getStudentStates<T = Record<string, unknown>>(
    classroomId: string,
    gameId: GameId
  ): Promise<Record<string, VersionedGameState<T>>>;
  patchStudentState<T = Record<string, unknown>>(
    studentId: string,
    gameId: GameId,
    patch: Partial<T>,
    expectedRev?: number
  ): Promise<VersionedGameState<T>>;
}

export interface AssetCatalogRepository {
  list(filter?: { category?: AssetMeta['category']; gameId?: GameId }): Promise<AssetMeta[]>;
  get(id: string): Promise<AssetMeta | null>;
}

export interface TeacherRepository {
  getProfile(): Promise<TeacherProfile>;
  updateProfile(patch: Partial<Omit<TeacherProfile, 'id' | 'tenantId'>>): Promise<TeacherProfile>;
}

export interface SettingsRepository {
  getSettings(): Promise<EcosystemSettings>;
  patchSettings(patch: Partial<EcosystemSettings>): Promise<EcosystemSettings>;
}

export interface EcosystemSnapshot {
  teacher: TeacherProfile;
  classrooms: ClassroomCore[];
  students: StudentCore[];
  ledger: PointTransaction[];
  classroomStates: Record<string, VersionedGameState>;
  studentStates: Record<string, VersionedGameState>;
}

export interface RepositoryBundle {
  teachers: TeacherRepository;
  classrooms: ClassroomRepository;
  students: StudentRepository;
  ledger: LedgerRepository;
  gameStates: GameStateRepository;
  assetsCatalog: AssetCatalogRepository;
  settings: SettingsRepository;
  restoreSnapshot(snapshot: EcosystemSnapshot): Promise<void>;
  resetToSeed(): Promise<void>;
}
