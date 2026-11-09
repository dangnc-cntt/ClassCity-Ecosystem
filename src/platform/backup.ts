export interface EcosystemBackupEnvelope {
  schemaVersion: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

export function createEmptyBackup(): EcosystemBackupEnvelope {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {},
  };
}
