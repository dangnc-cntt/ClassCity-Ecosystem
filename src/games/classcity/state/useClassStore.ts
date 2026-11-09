import { create } from 'zustand';
import type { Student, WeatherMode, VehicleKind } from './types';

export interface ClassCityStoreState {
  students: Student[];
  selectedStudentId: string | null;
  weatherMode: WeatherMode;
  vehicleKind: VehicleKind;
  selectStudent: (studentId: string | null) => void;
}

export const useClassStore = create<ClassCityStoreState>((set) => ({
  students: [],
  selectedStudentId: null,
  weatherMode: 'sunny',
  vehicleKind: 'car',
  selectStudent: (studentId) => set({ selectedStudentId: studentId }),
}));
