import type {
  AssetMeta,
  ClassroomCore,
  GameId,
  PointTransaction,
  StudentCore,
} from '../types/models';

export interface VersionedGameState<T = unknown> {
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
  update(studentId: string, patch: Partial<StudentCore>): Promise<StudentCore>;
}

export interface LedgerRepository {
  award(input: AwardPointsInput): Promise<AwardPointsResult>;
  history(studentId: string, limit?: number): Promise<PointTransaction[]>;
  totals(classroomId: string): Promise<Record<string, number>>;
}

export interface GameStateRepository {
  getClassroomState<T = unknown>(
    classroomId: string,
    gameId: GameId
  ): Promise<VersionedGameState<T> | null>;
  patchClassroomState<T = unknown>(
    classroomId: string,
    gameId: GameId,
    patch: Partial<T>,
    expectedRev?: number
  ): Promise<VersionedGameState<T>>;
  getStudentStates<T = unknown>(
    classroomId: string,
    gameId: GameId
  ): Promise<Record<string, VersionedGameState<T>>>;
  patchStudentState<T = unknown>(
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

export interface RepositoryBundle {
  classrooms: ClassroomRepository;
  students: StudentRepository;
  ledger: LedgerRepository;
  gameStates: GameStateRepository;
  assetsCatalog: AssetCatalogRepository;
}
