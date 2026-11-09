import type { Tier } from './types/models';

export interface EntitlementService {
  readonly tier: Tier;
  has(feature: string): boolean;
  limit(key: string): number;
}

export function createEntitlementService(tier: Tier = 'free'): EntitlementService {
  return {
    tier,
    has(feature: string): boolean {
      if (tier === 'pro') return true;
      return feature === 'classcity.single_class';
    },
    limit(key: string): number {
      if (key === 'max_students') return 40;
      return tier === 'pro' ? 50 : 1;
    },
  };
}
