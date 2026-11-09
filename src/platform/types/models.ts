export type GameId = string;

export type Tier = 'free' | 'pro';

export type Role =
  | 'platform_admin'
  | 'org_owner'
  | 'org_admin'
  | 'teacher'
  | 'assistant'
  | 'student'
  | 'guardian';

export type Permission =
  | 'roster:read'
  | 'roster:write'
  | 'ledger:write'
  | 'class:manage'
  | 'game:configure'
  | 'export:data'
  | 'org:manage'
  | 'billing:manage';

export interface SessionUser {
  userId: string;
  orgId: string;
  role: Role;
  displayName: string;
  studentId?: string;
}

export interface TeacherProfile {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  tier: Tier;
}

export interface ClassroomCore {
  id: string;
  tenantId: string;
  teacherId: string;
  name: string;
  createdAt: string;
  archivedAt?: string;
}

export interface StudentCore {
  id: string;
  tenantId: string;
  classroomId: string;
  studentCode: number;
  name: string;
  totalPoints: number;
  walletCoins: number;
  equippedAvatarId: string;
  unlockedAssetIds: string[];
  userId?: string;
}

export interface PointTransaction {
  id: string;
  tenantId: string;
  studentId: string;
  classroomId: string;
  gameId: GameId;
  delta: number;
  reason: string;
  idempotencyKey: string;
  createdAt: string;
  actorUserId: string;
}

export interface AssetMeta {
  id: string;
  category: 'avatar' | 'vehicle' | 'building' | 'prop' | 'pet';
  name: string;
  glbUrl: string;
  contentHash?: string;
  version: number;
  compatibleGames: GameId[] | '*';
  scale: number;
  yOffset: number;
}
