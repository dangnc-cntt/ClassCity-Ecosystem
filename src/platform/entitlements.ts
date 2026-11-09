import type { Tier } from './types/models';

export type FeatureKey =
  | 'classcity.single_class'
  | 'classcity.multi_class'
  | 'classcity.export_backup'
  | 'classcity.premium_avatars'
  | 'classcity.leaderboard_export';

export type LimitKey = 'max_classrooms' | 'max_students';

const TIER_FEATURES: Record<Tier, ReadonlySet<string>> = {
  free: new Set<FeatureKey>(['classcity.single_class']),
  pro: new Set<FeatureKey>([
    'classcity.single_class',
    'classcity.multi_class',
    'classcity.export_backup',
    'classcity.premium_avatars',
    'classcity.leaderboard_export',
  ]),
};

const TIER_LIMITS: Record<Tier, Record<LimitKey, number>> = {
  free: {
    max_classrooms: 1,
    max_students: 40,
  },
  pro: {
    max_classrooms: 50,
    max_students: 40,
  },
};

export interface EntitlementService {
  readonly tier: Tier;
  has(feature: string): boolean;
  limit(key: LimitKey | string): number;
  setTier(nextTier: Tier): void;
  subscribe(listener: (tier: Tier) => void): () => void;
}

export function createEntitlementService(initialTier: Tier = 'free'): EntitlementService {
  let currentTier: Tier = initialTier;
  const listeners = new Set<(tier: Tier) => void>();

  return {
    get tier(): Tier {
      return currentTier;
    },
    has(feature: string): boolean {
      return TIER_FEATURES[currentTier].has(feature);
    },
    limit(key: LimitKey | string): number {
      const limits = TIER_LIMITS[currentTier];
      if (key in limits) {
        return limits[key as LimitKey];
      }
      return 0;
    },
    setTier(nextTier: Tier): void {
      if (currentTier === nextTier) return;
      currentTier = nextTier;
      for (const listener of listeners) {
        listener(currentTier);
      }
    },
    subscribe(listener: (tier: Tier) => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
