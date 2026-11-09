import { create } from 'zustand';
import { DEFAULT_SESSION_USER } from '../../../platform/ports/auth';
import { defaultTenantBrand } from '../../../platform/theme/theme';
import { generateCityLayout } from '../config/cityLayout';
import { DEFAULT_POINTS_PER_LEVEL } from '../domain/levels';
import { INITIAL_VEHICLE_STATE } from '../domain/vehicleFsm';
import type { ClassCityStoreState, ToastNotice } from './types';

function createInitialData() {
  return {
    user: DEFAULT_SESSION_USER,
    tier: 'free' as const,
    activeClassroomId: 'class-5a',
    classrooms: [],
    isLoading: false,

    students: [],
    selectedStudentId: null,
    hoveredLotId: null,
    searchQuery: '',
    branchFilter: 'all' as const,

    pointsPerLevel: DEFAULT_POINTS_PER_LEVEL,
    wonderProgress: 0,
    weatherMode: 'sunny' as const,
    vehicleKind: 'car' as const,
    calledHistory: {},
    layout: generateCityLayout(36),
    giftBoxes: [],

    vehicleState: INITIAL_VEHICLE_STATE,
    activeAutoPlan: null,
    calledStudentId: null,
    nearestManualLotId: null,
    useDoublePointsOnNextAward: false,

    sidebarCollapsed: false,
    activeModal: 'none' as const,
    toasts: [],
    lastLevelUp: null,
    lastAwardedStudent: null,
    lowPowerMode: false,
    muted: false,
    locale: 'vi' as const,
    brand: { ...defaultTenantBrand },

    preloadedAssetIds: [],
    prefetchedAssetIds: [],
  };
}

export const useClassStore = create<ClassCityStoreState>((set) => ({
  ...createInitialData(),

  selectStudent: (studentId) => set({ selectedStudentId: studentId }),
  setHoveredLotId: (hoveredLotId) => set({ hoveredLotId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setBranchFilter: (branchFilter) => set({ branchFilter }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setNearestManualLotId: (nearestManualLotId) => set({ nearestManualLotId }),
  setUseDoublePointsOnNextAward: (useDoublePointsOnNextAward) =>
    set({ useDoublePointsOnNextAward }),

  pushToast: (message, kind = 'info') =>
    set((state) => {
      const notice: ToastNotice = {
        id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message,
        kind,
      };
      return { toasts: [...state.toasts.slice(-4), notice] };
    }),

  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  resetStore: () => set(createInitialData()),
}));
