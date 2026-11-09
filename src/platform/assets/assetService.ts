export interface LoadedAsset {
  id: string;
  scene: unknown;
}

export interface AssetService {
  get(assetId: string, options?: { priority?: 'high' | 'normal' | 'low' }): Promise<LoadedAsset | null>;
  prefetch(ids: string[], options?: { priority?: 'low' | 'normal' }): void;
  release(assetId: string): void;
  preloadUnique(ids: string[]): Promise<void>;
  stats(): { loadedCount: number; estimatedBytes: number };
  dispose(): void;
}

export function createAssetService(): AssetService {
  return {
    async get(): Promise<LoadedAsset | null> {
      return null;
    },
    prefetch(): void {},
    release(): void {},
    async preloadUnique(): Promise<void> {},
    stats() {
      return { loadedCount: 0, estimatedBytes: 0 };
    },
    dispose(): void {},
  };
}
