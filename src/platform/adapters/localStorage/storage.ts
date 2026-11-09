export const STORAGE_KEYS = {
  teachers: 'eco:v1:teachers',
  classrooms: 'eco:v1:classrooms',
  students: 'eco:v1:students',
  ledger: 'eco:v1:ledger',
  assetsCatalog: 'eco:v1:assets_catalog',
  settings: 'eco:v1:settings',
  classroomState: (gameId: string) => `eco:v1:game:${gameId}:classroom_state`,
  studentState: (gameId: string) => `eco:v1:game:${gameId}:student_state`,
} as const;

export interface StorageEnvelope<T> {
  schemaVersion: number;
  updatedAt: string;
  data: T;
}

/**
 * Migration map where key = source schemaVersion (migrates from v -> v + 1).
 */
export type MigrationMap = Record<number, (oldData: unknown) => unknown>;

export const DEFAULT_MIGRATIONS: MigrationMap = {};

export type QuotaErrorListener = (key: string, err: unknown) => void;

const quotaListeners = new Set<QuotaErrorListener>();

export function onStorageQuotaError(listener: QuotaErrorListener): () => void {
  quotaListeners.add(listener);
  return () => {
    quotaListeners.delete(listener);
  };
}

function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

export function runEnvelopeMigrations<T>(
  envelope: StorageEnvelope<unknown>,
  targetVersion: number,
  migrations: MigrationMap = DEFAULT_MIGRATIONS
): { envelope: StorageEnvelope<T>; migrated: boolean } {
  let version = envelope.schemaVersion ?? 1;
  let currentData = envelope.data;
  let migrated = false;

  while (version < targetVersion) {
    const migrateFn = migrations[version];
    if (migrateFn) {
      currentData = migrateFn(currentData);
    }
    version += 1;
    migrated = true;
  }

  return {
    envelope: {
      schemaVersion: version,
      updatedAt: migrated ? new Date().toISOString() : envelope.updatedAt,
      data: currentData as T,
    },
    migrated,
  };
}

export function getStorageItem<T>(
  key: string,
  options?: { targetVersion?: number; migrations?: MigrationMap }
): StorageEnvelope<T> | null {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StorageEnvelope<unknown>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
      return null;
    }
    const targetVersion = options?.targetVersion ?? 1;
    const { envelope, migrated } = runEnvelopeMigrations<T>(
      parsed,
      targetVersion,
      options?.migrations ?? DEFAULT_MIGRATIONS
    );
    if (migrated) {
      setStorageItem(key, envelope.data, envelope.schemaVersion);
    }
    return envelope;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(
  key: string,
  data: T,
  schemaVersion = 1
): boolean {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    const envelope: StorageEnvelope<T> = {
      schemaVersion,
      updatedAt: new Date().toISOString(),
      data,
    };
    storage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch (err) {
    for (const listener of quotaListeners) {
      listener(key, err);
    }
    return false;
  }
}

export function removeStorageItem(key: string): void {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore
  }
}

export function clearEcosystemStorage(): void {
  const storage = getLocalStorage();
  if (!storage) return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const k = storage.key(i);
    if (k && k.startsWith('eco:v1:')) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
}
