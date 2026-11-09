import type {
  ClassroomCore,
  SessionUser,
  StudentCore,
  TenantBrand,
  Tier,
} from '../../../platform/types/models';
import type { CityLayout } from '../config/cityLayout';
import type { GiftBoxSpot, PerkKind } from '../domain/perks';
import type { AutoDrivePlan, VehicleState } from '../domain/vehicleFsm';

export type WeatherMode = 'sunny' | 'rainy' | 'rainbow';

export type ShopBranch =
  | 'bakery'
  | 'cafe'
  | 'bookstore'
  | 'petshop'
  | 'gamecenter';

export type VehicleKind = 'car' | 'ambulance' | 'ufo';

export type ActiveModal =
  | 'none'
  | 'callout'
  | 'leaderboard'
  | 'settings'
  | 'import_export'
  | 'ecosystem'
  | 'upgrade_pro';

export interface PerkCard {
  id: string;
  kind: PerkKind;
  acquiredAt: string;
  usedAt?: string;
}

export interface ClassroomCityState {
  pointsPerLevel: number;
  wonderProgress: number;
  weatherMode: WeatherMode;
  vehicleKind: VehicleKind;
  calledHistory: Record<string, number>;
}

export interface StudentCityState {
  lotNumber: number;
  shopBranch: ShopBranch;
  shopColor: string;
  perks: PerkCard[];
}

export type Student = StudentCore &
  StudentCityState & {
    level: number; // DẪN XUẤT từ totalPoints và pointsPerLevel
  };

export interface ToastNotice {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

export interface LevelUpEventInfo {
  studentId: string;
  lotNumber: number;
  oldLevel: number;
  newLevel: number;
  timestamp: number;
}

export interface StudentAwardJumpInfo {
  studentId: string;
  lotNumber: number;
  delta: number;
  timestamp: number;
}

export interface ClassCityStoreState {
  // 1. Session slice
  user: SessionUser;
  tier: Tier;
  activeClassroomId: string;
  classrooms: ClassroomCore[];
  isLoading: boolean;

  // 2. Roster slice
  students: Student[];
  selectedStudentId: string | null;
  hoveredLotId: number | null;
  searchQuery: string;
  branchFilter: ShopBranch | 'all';

  // 3. CityState slice
  pointsPerLevel: number;
  wonderProgress: number;
  weatherMode: WeatherMode;
  vehicleKind: VehicleKind;
  calledHistory: Record<string, number>;
  layout: CityLayout;
  giftBoxes: GiftBoxSpot[];

  // 4. Vehicle slice
  vehicleState: VehicleState;
  activeAutoPlan: AutoDrivePlan | null;
  calledStudentId: string | null;
  nearestManualLotId: number | null;
  useDoublePointsOnNextAward: boolean;

  // 5. UI slice
  sidebarCollapsed: boolean;
  activeModal: ActiveModal;
  toasts: ToastNotice[];
  lastLevelUp: LevelUpEventInfo | null;
  lastAwardedStudent: StudentAwardJumpInfo | null;
  lowPowerMode: boolean;
  muted: boolean;
  locale: 'vi' | 'en';
  brand: TenantBrand;

  // 6. Assets slice
  preloadedAssetIds: string[];
  prefetchedAssetIds: string[];

  // Store actions
  selectStudent: (studentId: string | null) => void;
  setHoveredLotId: (lotId: number | null) => void;
  setSearchQuery: (query: string) => void;
  setBranchFilter: (branch: ShopBranch | 'all') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveModal: (modal: ActiveModal) => void;
  setNearestManualLotId: (lotId: number | null) => void;
  setUseDoublePointsOnNextAward: (enable: boolean) => void;
  pushToast: (message: string, kind?: ToastNotice['kind']) => void;
  dismissToast: (id: string) => void;
  resetStore: () => void;
}
