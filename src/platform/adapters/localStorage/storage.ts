export interface StorageEnvelope<T> {
  schemaVersion: number;
  updatedAt: string;
  data: T;
}

export function getStorageItem<T>(key: string): StorageEnvelope<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StorageEnvelope<T>;
  } catch {
    return null;
  }
}

export function setStorageItem<T>(key: string, data: T, schemaVersion = 1): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const envelope: StorageEnvelope<T> = {
      schemaVersion,
      updatedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}
