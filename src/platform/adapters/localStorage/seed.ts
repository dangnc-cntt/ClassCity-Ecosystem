import type {
  AssetMeta,
  ClassroomCore,
  EcosystemSettings,
  PointTransaction,
  StudentCore,
  TeacherProfile,
} from '../../types/models';
import type { VersionedGameState } from '../../ports/repositories';
import { SHARED_ASSETS_CATALOG } from '../../assets/sharedCatalog';
import { defaultTenantBrand } from '../../theme/theme';

/**
 * Deterministic PRNG (mulberry32). Returns values in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED_PASTEL_COLORS = [
  '#FDE68A',
  '#BFDBFE',
  '#BBF7D0',
  '#FBCFE8',
  '#DDD6FE',
  '#FED7AA',
  '#99F6E4',
  '#FECACA',
  '#E9D5FF',
  '#A7F3D0',
  '#BAE6FD',
  '#FEF08A',
] as const;

export const SEED_SHOP_BRANCHES = [
  'bakery',
  'cafe',
  'bookstore',
  'petshop',
  'gamecenter',
] as const;

export const SEED_FENCE_ITEMS = [
  'none',
  'white_picket',
  'brick_wall',
  'hedge',
  'stone_wall',
] as const;

export const SEED_TREE_ITEMS = [
  'none',
  'pine',
  'sakura',
  'fruit_tree',
  'flower_bed',
] as const;

export const SEED_PET_ITEMS = [
  'none',
  'puppy',
  'kitten',
  'bunny',
  'duckling',
] as const;

export const SEED_SIGN_ITEMS = [
  'none',
  'wooden_board',
  'standing_banner',
  'neon_post',
  'mailbox_sign',
] as const;

export const SEED_AVATAR_IDS = [
  'avatar_knight',
  'avatar_mage',
  'avatar_astronaut',
  'avatar_dino',
  'avatar_cat',
] as const;

/**
 * 60 distinct, realistic Vietnamese student names (36 for Lớp 5A + 24 for Lớp 5B).
 */
export const VIETNAMESE_STUDENT_NAMES: readonly string[] = [
  // Lớp 5A (36 học sinh)
  'Nguyễn Minh Anh',
  'Trần Gia Bảo',
  'Lê Khánh Chi',
  'Phạm Đức Dũng',
  'Hoàng Thảo Đan',
  'Vũ Hải Đăng',
  'Đặng Ngọc Hân',
  'Bùi Quang Hiếu',
  'Đỗ Minh Hoàng',
  'Hồ Gia Huy',
  'Ngô Bảo Khang',
  'Dương Tuấn Kiệt',
  'Lý Phương Linh',
  'Đinh Hoàng Long',
  'Trương Bảo Minh',
  'Mai Tuyết Ngân',
  'Phan Khôi Nguyên',
  'Võ Yến Nhi',
  'Đoàn Thiên Phúc',
  'Lương Minh Quân',
  'Trịnh Thái Sơn',
  'Tạ Phương Thảo',
  'Châu Anh Thư',
  'Quách Hữu Thiện',
  'Tô Thủy Tiên',
  'Hà Quốc Trung',
  'Lâm Thanh Trúc',
  'Phùng Cát Tường',
  'Vương Khánh Vân',
  'Kiều Thế Vinh',
  'Nguyễn Hà Vy',
  'Trần Nhật Minh',
  'Lê Hoàng Bách',
  'Phạm Ngọc Diệp',
  'Hoàng Kiến Văn',
  'Vũ Minh Khuê',
  // Lớp 5B (24 học sinh)
  'Nguyễn Tuấn Anh',
  'Trần Bảo Châu',
  'Lê Minh Đức',
  'Phạm Hương Giang',
  'Hoàng Gia Hân',
  'Vũ Trung Hiếu',
  'Đặng Minh Khôi',
  'Bùi Khánh Linh',
  'Đỗ Thành Nam',
  'Hồ Thảo Nguyên',
  'Ngô Nhật Phong',
  'Dương Minh Phương',
  'Lý Đăng Khoa',
  'Đinh Thùy Trang',
  'Trương Quốc Việt',
  'Mai Thanh Xuân',
  'Phan Hải Yến',
  'Võ Đình Trọng',
  'Đoàn Khánh Toàn',
  'Lương Bích Ngọc',
  'Trịnh Hoàng Quân',
  'Tạ Minh Tâm',
  'Châu Bảo Trâm',
  'Quách Tuấn Tú',
];

export interface SeedClassroomCityData {
  pointsPerLevel: number;
  wonderProgress: number;
  weatherMode: 'sunny' | 'rainy' | 'rainbow';
  vehicleKind: 'car' | 'ambulance' | 'ufo';
  calledHistory: Record<string, number>;
}

export interface SeedStudentCityData {
  lotNumber: number;
  shopBranch: (typeof SEED_SHOP_BRANCHES)[number];
  shopColor: string;
  lotItems: {
    fence: (typeof SEED_FENCE_ITEMS)[number];
    tree: (typeof SEED_TREE_ITEMS)[number];
    pet: (typeof SEED_PET_ITEMS)[number];
    sign: (typeof SEED_SIGN_ITEMS)[number];
  };
  perks: Array<{
    id: string;
    kind: 'double_points' | 'ask_help' | 'lucky_point';
    acquiredAt: string;
    usedAt?: string;
  }>;
}

export interface SeedDataset {
  teachers: TeacherProfile[];
  classrooms: ClassroomCore[];
  students: StudentCore[];
  ledger: PointTransaction[];
  assetsCatalog: AssetMeta[];
  classroomStates: Record<string, VersionedGameState<SeedClassroomCityData>>;
  studentStates: Record<string, VersionedGameState<SeedStudentCityData>>;
  settings: EcosystemSettings;
}

/**
 * Target point values for the 36 students of Lớp 5A (with pointsPerLevel = 5):
 * - Several at level 1–3 (0..14 pts)
 * - Many at level 4–12 (15..59 pts)
 * - Several at level 15–20 (70..98 pts)
 * - Explicitly includes 3 students at level 19 missing <= 2 pts to reach level 20 (93, 94, 93 pts)
 */
const CLASS_5A_TARGET_POINTS: readonly number[] = [
  0, 3, 7, 11, 14, // Levels 1-3 (5 students)
  16, 19, 21, 24, 27, 30, 33, 36, 38, 41, 44, 47, 50, 53, 56, 58, // Levels 4-12 (16 students)
  62, 67, // Levels 13-14 (2 students)
  71, 76, 81, 86, 88, // Levels 15-18 (5 students)
  93, 94, 93, // Level 19 missing 1-2 points to Level 20 (3 students -> prefetch ready!)
  95, 97, 100, 102, 96, // Level 20 (5 students)
];

export function buildSeedDataset(seed = 20261109): SeedDataset {
  const rng = mulberry32(seed);
  const nowIso = '2026-11-01T08:00:00.000Z';

  const teacher: TeacherProfile = {
    id: 'teacher-local',
    tenantId: 'local',
    name: 'Cô Nguyễn Thu Hà',
    email: 'teacher@classcity.local',
    tier: 'free',
  };

  const classrooms: ClassroomCore[] = [
    {
      id: 'class-5a',
      tenantId: 'local',
      teacherId: teacher.id,
      name: 'Lớp 5A',
      createdAt: nowIso,
    },
    {
      id: 'class-5b',
      tenantId: 'local',
      teacherId: teacher.id,
      name: 'Lớp 5B',
      createdAt: nowIso,
    },
  ];

  const students: StudentCore[] = [];
  const ledger: PointTransaction[] = [];
  const studentStates: Record<string, VersionedGameState<SeedStudentCityData>> = {};

  const createClassRoster = (
    classroomId: string,
    count: number,
    nameOffset: number,
    is5A: boolean
  ): number => {
    let classTotalPoints = 0;

    for (let i = 0; i < count; i += 1) {
      const code = i + 1;
      const studentId = `${classroomId}-stu-${String(code).padStart(2, '0')}`;
      const name = VIETNAMESE_STUDENT_NAMES[nameOffset + i] ?? `Học sinh ${code}`;

      const avatarIdx = Math.floor(rng() * SEED_AVATAR_IDS.length);
      const branchIdx = Math.floor(rng() * SEED_SHOP_BRANCHES.length);
      const colorIdx = (i + Math.floor(rng() * 3)) % SEED_PASTEL_COLORS.length;

      const targetPoints = is5A
        ? (CLASS_5A_TARGET_POINTS[i] ?? 10)
        : Math.floor(rng() * 60);

      // Build immutable ledger transactions that sum to targetPoints
      let remaining = targetPoints;
      let txIndex = 0;
      while (remaining > 0) {
        const step = remaining >= 5 ? 5 : remaining >= 2 ? 2 : 1;
        remaining -= step;
        txIndex += 1;
        ledger.push({
          id: `tx-seed-${studentId}-${txIndex}`,
          tenantId: 'local',
          studentId,
          classroomId,
          gameId: 'seed',
          delta: step,
          reason: 'seed:initial_points',
          idempotencyKey: `seed-${studentId}-${txIndex}`,
          createdAt: nowIso,
          actorUserId: 'local-teacher',
        });
      }

      classTotalPoints += targetPoints;

      students.push({
        id: studentId,
        tenantId: 'local',
        classroomId,
        studentCode: code,
        name,
        totalPoints: targetPoints,
        walletCoins: targetPoints * 2,
        equippedAvatarId: SEED_AVATAR_IDS[avatarIdx],
        unlockedAssetIds: [...SEED_AVATAR_IDS],
      });

      const fenceIdx = 1 + (Math.floor(rng() * (SEED_FENCE_ITEMS.length - 1)));
      const treeIdx = 1 + (Math.floor(rng() * (SEED_TREE_ITEMS.length - 1)));
      const petIdx = Math.floor(rng() * SEED_PET_ITEMS.length);
      const signIdx = 1 + (Math.floor(rng() * (SEED_SIGN_ITEMS.length - 1)));

      studentStates[`${studentId}:classcity`] = {
        schemaVersion: 1,
        rev: 1,
        data: {
          lotNumber: code,
          shopBranch: SEED_SHOP_BRANCHES[branchIdx],
          shopColor: SEED_PASTEL_COLORS[colorIdx],
          lotItems: {
            fence: SEED_FENCE_ITEMS[fenceIdx]!,
            tree: SEED_TREE_ITEMS[treeIdx]!,
            pet: SEED_PET_ITEMS[petIdx]!,
            sign: SEED_SIGN_ITEMS[signIdx]!,
          },
          perks: [],
        },
      };
    }

    return classTotalPoints;
  };

  const total5A = createClassRoster('class-5a', 36, 0, true);
  const total5B = createClassRoster('class-5b', 24, 36, false);

  const classroomStates: Record<string, VersionedGameState<SeedClassroomCityData>> = {
    'class-5a:classcity': {
      schemaVersion: 1,
      rev: 1,
      data: {
        pointsPerLevel: 5,
        wonderProgress: total5A,
        weatherMode: 'sunny',
        vehicleKind: 'car',
        calledHistory: {},
      },
    },
    'class-5b:classcity': {
      schemaVersion: 1,
      rev: 1,
      data: {
        pointsPerLevel: 5,
        wonderProgress: total5B,
        weatherMode: 'sunny',
        vehicleKind: 'car',
        calledHistory: {},
      },
    },
  };

  const settings: EcosystemSettings = {
    locale: 'vi',
    muted: false,
    brand: { ...defaultTenantBrand },
    devTier: 'free',
    activeClassroomId: 'class-5a',
    lowPowerMode: false,
  };

  return {
    teachers: [teacher],
    classrooms,
    students,
    ledger,
    assetsCatalog: [...SHARED_ASSETS_CATALOG],
    classroomStates,
    studentStates,
    settings,
  };
}
