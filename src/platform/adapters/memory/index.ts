import type { RepositoryBundle } from '../../ports/repositories';
import {
  createRepositoryBundleFromDriver,
  type KeyValueDriver,
} from '../localStorage/repositories';

export function createInMemoryDriver(): KeyValueDriver {
  const store = new Map<string, string>();
  return {
    get<T>(key: string): T | null {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return JSON.parse(raw) as T;
    },
    set<T>(key: string, value: T): void {
      store.set(key, JSON.stringify(value));
    },
    clear(): void {
      store.clear();
    },
  };
}

export function createInMemoryAdapter(options?: {
  autoSeed?: boolean;
  seed?: number;
}): RepositoryBundle {
  const driver = createInMemoryDriver();
  return createRepositoryBundleFromDriver(driver, options);
}
