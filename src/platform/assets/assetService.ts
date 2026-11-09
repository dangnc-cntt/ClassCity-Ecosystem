import type { Object3D } from 'three';
import { GLTFLoader, DRACOLoader } from 'three-stdlib';
import type { AssetMeta } from '../types/models';
import type { TelemetryPort } from '../ports/telemetry';
import { SHARED_ASSETS_CATALOG } from './sharedCatalog';

export type AssetPriority = 'high' | 'normal' | 'low';

export interface LoadedAsset {
  id: string;
  cacheKey: string;
  scene: Object3D;
  animations: unknown[];
  estimatedBytes: number;
}

export interface AssetService {
  get(
    assetId: string,
    options?: { priority?: AssetPriority }
  ): Promise<LoadedAsset | null>;
  prefetch(ids: string[], options?: { priority?: AssetPriority }): void;
  release(assetId: string): void;
  preloadUnique(ids: string[]): Promise<void>;
  stats(): {
    loadedCount: number;
    inFlightCount: number;
    queuedCount: number;
    estimatedBytes: number;
  };
  dispose(): void;
}

interface CacheEntry {
  asset: LoadedAsset;
  refCount: number;
  lastUsedAt: number;
  ttlTimer?: ReturnType<typeof setTimeout>;
}

interface QueueTask {
  assetId: string;
  cacheKey: string;
  url: string;
  priority: AssetPriority;
  enqueuedAt: number;
  resolve: (val: LoadedAsset | null) => void;
}

const PRIORITY_WEIGHT: Record<AssetPriority, number> = {
  high: 3,
  normal: 2,
  low: 1,
};

const DEFAULT_MAX_CONCURRENT = 3;
const DEFAULT_BUDGET_BYTES = 200 * 1024 * 1024; // ~200 MB
const DEFAULT_TTL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_ESTIMATED_ASSET_BYTES = 1_500_000; // ~1.5 MB per GLB estimate

function disposeSceneResources(root: Object3D | null | undefined): void {
  if (!root || typeof root.traverse !== 'function') return;
  root.traverse((obj) => {
    const mesh = obj as Object3D & {
      geometry?: { dispose?: () => void };
      material?: unknown;
    };
    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }
    const disposeMat = (mat: unknown) => {
      if (!mat || typeof mat !== 'object') return;
      const rec = mat as Record<string, unknown> & { dispose?: () => void };
      for (const val of Object.values(rec)) {
        if (val && typeof val === 'object') {
          const tex = val as { isTexture?: boolean; dispose?: () => void };
          if (tex.isTexture && typeof tex.dispose === 'function') {
            tex.dispose();
          }
        }
      }
      if (typeof rec.dispose === 'function') {
        rec.dispose();
      }
    };
    if (Array.isArray(mesh.material)) {
      for (const m of mesh.material) disposeMat(m);
    } else if (mesh.material) {
      disposeMat(mesh.material);
    }
  });
}

export interface CreateAssetServiceOptions {
  catalog?: AssetMeta[];
  telemetry?: TelemetryPort;
  maxConcurrent?: number;
  budgetBytes?: number;
  ttlMs?: number;
  timeoutMs?: number;
  customLoader?: (url: string, assetId: string) => Promise<{ scene: Object3D; animations?: unknown[]; estimatedBytes?: number }>;
}

export function createAssetService(
  options?: CreateAssetServiceOptions
): AssetService {
  const catalogMap = new Map<string, AssetMeta>();
  for (const item of options?.catalog ?? SHARED_ASSETS_CATALOG) {
    catalogMap.set(item.id, item);
  }

  const telemetry = options?.telemetry;
  const maxConcurrent = options?.maxConcurrent ?? DEFAULT_MAX_CONCURRENT;
  const budgetBytes = options?.budgetBytes ?? DEFAULT_BUDGET_BYTES;
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const cache = new Map<string, CacheEntry>();
  const keyByAssetId = new Map<string, string>();
  const inFlight = new Map<string, Promise<LoadedAsset | null>>();
  const queue: QueueTask[] = [];
  let activeCount = 0;
  let totalBytes = 0;
  let disposed = false;

  let gltfLoader: GLTFLoader | null = null;
  let dracoLoader: DRACOLoader | null = null;

  const getLoader = (): GLTFLoader => {
    if (!gltfLoader) {
      gltfLoader = new GLTFLoader();
      try {
        dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('/draco/');
        gltfLoader.setDRACOLoader(dracoLoader);
      } catch {
        // Ignore if DRACOLoader setup fails in headless test environments
      }
    }
    return gltfLoader;
  };

  const resolveMeta = (assetId: string): { cacheKey: string; url: string } => {
    const meta = catalogMap.get(assetId);
    if (meta) {
      const hash = meta.contentHash ?? `v${meta.version}`;
      return {
        cacheKey: `${meta.id}@${hash}`,
        url: meta.glbUrl,
      };
    }
    const isShared = assetId.startsWith('avatar_') || assetId.startsWith('prop_');
    const url = isShared
      ? `/shared-assets/models/${assetId}.glb`
      : `/games/classcity/models/${assetId}.glb`;
    return {
      cacheKey: `${assetId}@v1`,
      url,
    };
  };

  const evictCacheEntry = (cacheKey: string): void => {
    const entry = cache.get(cacheKey);
    if (!entry) return;
    if (entry.ttlTimer) {
      clearTimeout(entry.ttlTimer);
    }
    disposeSceneResources(entry.asset.scene);
    totalBytes = Math.max(0, totalBytes - entry.asset.estimatedBytes);
    cache.delete(cacheKey);
    keyByAssetId.delete(entry.asset.id);
  };

  const enforceLruBudget = (): void => {
    if (totalBytes <= budgetBytes) return;
    const candidates = Array.from(cache.entries())
      .filter(([, entry]) => entry.refCount <= 0)
      .sort((a, b) => a[1].lastUsedAt - b[1].lastUsedAt);

    for (const [key] of candidates) {
      if (totalBytes <= budgetBytes) break;
      evictCacheEntry(key);
    }
  };

  const loadWithTimeout = async (
    url: string,
    assetId: string
  ): Promise<LoadedAsset | null> => {
    const { cacheKey } = resolveMeta(assetId);

    const loadPromise = (async (): Promise<LoadedAsset | null> => {
      if (options?.customLoader) {
        const res = await options.customLoader(url, assetId);
        return {
          id: assetId,
          cacheKey,
          scene: res.scene,
          animations: res.animations ?? [],
          estimatedBytes: res.estimatedBytes ?? DEFAULT_ESTIMATED_ASSET_BYTES,
        };
      }

      const loader = getLoader();
      const gltf = await loader.loadAsync(url);
      return {
        id: assetId,
        cacheKey,
        scene: gltf.scene,
        animations: gltf.animations ?? [],
        estimatedBytes: DEFAULT_ESTIMATED_ASSET_BYTES,
      };
    })();

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<null>((resolve) => {
      timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
    });

    try {
      const winner = await Promise.race([loadPromise, timeoutPromise]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (!winner) {
        telemetry?.track('asset_missing', { assetId, reason: 'timeout' });
        return null;
      }
      return winner;
    } catch {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      telemetry?.track('asset_missing', { assetId, reason: 'error_or_404' });
      return null;
    }
  };

  const pumpQueue = (): void => {
    if (disposed) return;
    while (activeCount < maxConcurrent && queue.length > 0) {
      queue.sort((a, b) => {
        const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        return diff !== 0 ? diff : a.enqueuedAt - b.enqueuedAt;
      });

      const nextTask = queue.shift();
      if (!nextTask) break;

      activeCount += 1;
      void loadWithTimeout(nextTask.url, nextTask.assetId)
        .then((loaded) => {
          if (disposed) {
            if (loaded) disposeSceneResources(loaded.scene);
            nextTask.resolve(null);
            return;
          }
          if (loaded) {
            cache.set(nextTask.cacheKey, {
              asset: loaded,
              refCount: 1,
              lastUsedAt: Date.now(),
            });
            keyByAssetId.set(nextTask.assetId, nextTask.cacheKey);
            totalBytes += loaded.estimatedBytes;
            enforceLruBudget();
          }
          nextTask.resolve(loaded);
        })
        .finally(() => {
          activeCount = Math.max(0, activeCount - 1);
          inFlight.delete(nextTask.cacheKey);
          pumpQueue();
        });
    }
  };

  return {
    async get(
      assetId: string,
      getOpts?: { priority?: AssetPriority }
    ): Promise<LoadedAsset | null> {
      if (disposed) return null;
      const priority = getOpts?.priority ?? 'high';
      const { cacheKey, url } = resolveMeta(assetId);

      const cached = cache.get(cacheKey);
      if (cached) {
        if (cached.ttlTimer) {
          clearTimeout(cached.ttlTimer);
          cached.ttlTimer = undefined;
        }
        cached.refCount += 1;
        cached.lastUsedAt = Date.now();
        return cached.asset;
      }

      const existingFlight = inFlight.get(cacheKey);
      if (existingFlight) {
        // Boost priority if already queued at lower priority
        const queuedTask = queue.find((q) => q.cacheKey === cacheKey);
        if (
          queuedTask &&
          PRIORITY_WEIGHT[priority] > PRIORITY_WEIGHT[queuedTask.priority]
        ) {
          queuedTask.priority = priority;
        }
        const res = await existingFlight;
        const entryAfter = cache.get(cacheKey);
        if (entryAfter) {
          entryAfter.refCount += 1;
          entryAfter.lastUsedAt = Date.now();
        }
        return res;
      }

      const flightPromise = new Promise<LoadedAsset | null>((resolve) => {
        queue.push({
          assetId,
          cacheKey,
          url,
          priority,
          enqueuedAt: Date.now(),
          resolve,
        });
      });

      inFlight.set(cacheKey, flightPromise);
      pumpQueue();
      return flightPromise;
    },

    prefetch(ids: string[], prefetchOpts?: { priority?: AssetPriority }): void {
      if (disposed) return;
      const priority = prefetchOpts?.priority ?? 'low';
      const uniqueIds = Array.from(new Set(ids));

      const schedule =
        typeof window !== 'undefined' && 'requestIdleCallback' in window
          ? (cb: () => void) =>
              (
                window as Window & {
                  requestIdleCallback: (fn: () => void) => number;
                }
              ).requestIdleCallback(cb)
          : (cb: () => void) => setTimeout(cb, 16);

      schedule(() => {
        if (disposed) return;
        for (const id of uniqueIds) {
          void this.get(id, { priority }).then((loaded) => {
            if (loaded) {
              this.release(id);
            }
          });
        }
      });
    },

    release(assetId: string): void {
      const cacheKey = keyByAssetId.get(assetId) ?? resolveMeta(assetId).cacheKey;
      const entry = cache.get(cacheKey);
      if (!entry) return;

      entry.refCount = Math.max(0, entry.refCount - 1);
      entry.lastUsedAt = Date.now();

      if (entry.refCount === 0 && !entry.ttlTimer) {
        entry.ttlTimer = setTimeout(() => {
          const current = cache.get(cacheKey);
          if (current && current.refCount <= 0) {
            evictCacheEntry(cacheKey);
          }
        }, ttlMs);
      }
    },

    async preloadUnique(ids: string[]): Promise<void> {
      if (disposed) return;
      const unique = Array.from(new Set(ids));
      await Promise.all(unique.map((id) => this.get(id, { priority: 'high' })));
    },

    stats() {
      return {
        loadedCount: cache.size,
        inFlightCount: inFlight.size,
        queuedCount: queue.length,
        estimatedBytes: totalBytes,
      };
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      queue.splice(0, queue.length);
      inFlight.clear();
      for (const key of Array.from(cache.keys())) {
        evictCacheEntry(key);
      }
      if (dracoLoader) {
        dracoLoader.dispose();
        dracoLoader = null;
      }
      gltfLoader = null;
    },
  };
}
