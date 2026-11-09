import type { StudentCore } from '../../../platform/types/models';
import type { PerkKind } from '../domain/perks';

export type WeatherMode = 'sunny' | 'rainy' | 'rainbow';

export type ShopBranch = 'bakery' | 'cafe' | 'bookstore' | 'petshop' | 'gamecenter';

export type VehicleKind = 'car' | 'ambulance' | 'ufo';

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
    level: number;
  };
