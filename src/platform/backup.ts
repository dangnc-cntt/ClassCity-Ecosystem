import { z } from 'zod';
import {
  validateStudentImportRows,
  type RepositoryBundle,
  type ValidationIssue,
} from './ports/repositories';

const TeacherProfileSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1).max(80),
  email: z.string().min(1),
  tier: z.enum(['free', 'pro']),
});

const ClassroomCoreSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  teacherId: z.string().min(1),
  name: z.string().min(1).max(60),
  createdAt: z.string().min(1),
  archivedAt: z.string().optional(),
});

const StudentCoreSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  classroomId: z.string().min(1),
  studentCode: z.number().int().min(1).max(40),
  name: z.string().min(1).max(40),
  totalPoints: z.number().int().min(0),
  walletCoins: z.number().int().min(0),
  equippedAvatarId: z.string().min(1),
  unlockedAssetIds: z.array(z.string()),
  userId: z.string().optional(),
});

const PointTransactionSchema = z.object({
  id: z.string().min(1),
  tenantId: z.string().min(1),
  studentId: z.string().min(1),
  classroomId: z.string().min(1),
  gameId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1),
  idempotencyKey: z.string().min(1),
  createdAt: z.string().min(1),
  actorUserId: z.string().min(1),
});

const VersionedStateSchema = z.object({
  schemaVersion: z.number().int().min(1),
  rev: z.number().int().min(1),
  data: z.record(z.string(), z.unknown()),
});

export const EcosystemBackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().min(1),
  data: z.object({
    teacher: TeacherProfileSchema,
    classrooms: z.array(ClassroomCoreSchema).min(1),
    students: z.array(StudentCoreSchema),
    ledger: z.array(PointTransactionSchema),
    classroomStates: z.record(z.string(), VersionedStateSchema),
    studentStates: z.record(z.string(), VersionedStateSchema),
  }),
});

export type EcosystemBackupEnvelope = z.infer<typeof EcosystemBackupSchema>;

export async function exportEcosystemBackup(
  repos: RepositoryBundle
): Promise<EcosystemBackupEnvelope> {
  const teacher = await repos.teachers.getProfile();
  const classrooms = await repos.classrooms.list();
  const students: z.infer<typeof StudentCoreSchema>[] = [];
  const ledger: z.infer<typeof PointTransactionSchema>[] = [];
  const classroomStates: Record<string, z.infer<typeof VersionedStateSchema>> = {};
  const studentStates: Record<string, z.infer<typeof VersionedStateSchema>> = {};

  for (const c of classrooms) {
    const classStudents = await repos.students.listByClassroom(c.id);
    students.push(...classStudents);

    const cState = await repos.gameStates.getClassroomState(c.id, 'classcity');
    if (cState) {
      classroomStates[c.id] = cState;
    }

    const sStates = await repos.gameStates.getStudentStates(c.id, 'classcity');
    for (const [stuId, st] of Object.entries(sStates)) {
      studentStates[stuId] = st;
    }

    for (const stu of classStudents) {
      const txs = await repos.ledger.history(stu.id, 10000);
      ledger.push(...txs.slice().reverse());
    }
  }

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: {
      teacher,
      classrooms,
      students,
      ledger,
      classroomStates,
      studentStates,
    },
  };
}

export function validateEcosystemBackup(
  raw: unknown
):
  | { ok: true; backup: EcosystemBackupEnvelope }
  | { ok: false; issues: ValidationIssue[] } {
  const result = EcosystemBackupSchema.safeParse(raw);
  if (!result.success) {
    const issues: ValidationIssue[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
    }));
    return { ok: false, issues };
  }
  return { ok: true, backup: result.data };
}

export async function importEcosystemBackup(
  repos: RepositoryBundle,
  raw: unknown
): Promise<
  | { ok: true; backup: EcosystemBackupEnvelope }
  | { ok: false; issues: ValidationIssue[] }
> {
  const validated = validateEcosystemBackup(raw);
  if (!validated.ok) {
    return validated;
  }
  await repos.restoreSnapshot(validated.backup.data);
  return validated;
}

export interface ParsedStudentRow {
  studentCode: number;
  name: string;
}

/**
 * Parses and strictly validates CSV roster content (`studentCode,name`).
 */
export function parseStudentRosterCsv(
  csvText: string
):
  | { ok: true; rows: ParsedStudentRow[] }
  | { ok: false; issues: ValidationIssue[] } {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const nonEmptyLines: Array<{ lineNumber: number; text: string }> = [];
  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (trimmed.length > 0) {
      nonEmptyLines.push({ lineNumber: idx + 1, text: trimmed });
    }
  });

  if (nonEmptyLines.length === 0) {
    return {
      ok: false,
      issues: [{ field: 'csv', message: 'Nội dung CSV trống.' }],
    };
  }

  // Skip optional header row if the first column is non-numeric (e.g. "studentCode,name")
  let startIdx = 0;
  const firstParts = nonEmptyLines[0]?.text.split(',') ?? [];
  const firstCol = firstParts[0]?.trim().replace(/^["']|["']$/g, '') ?? '';
  if (firstCol.length > 0 && Number.isNaN(Number(firstCol))) {
    startIdx = 1;
  }

  const dataLines = nonEmptyLines.slice(startIdx);
  if (dataLines.length === 0) {
    return {
      ok: false,
      issues: [{ field: 'csv', message: 'Không có dòng dữ liệu học sinh nào.' }],
    };
  }

  const issues: ValidationIssue[] = [];
  const parsedRows: Array<{ lineNumber: number; studentCode: number; name: string }> = [];

  for (const item of dataLines) {
    const commaIdx = item.text.indexOf(',');
    if (commaIdx < 0) {
      issues.push({
        row: item.lineNumber,
        field: 'line',
        message: `Dòng ${item.lineNumber}: Thiếu dấu phẩy ngăn cách "studentCode,name".`,
      });
      continue;
    }

    const codeRaw = item.text
      .slice(0, commaIdx)
      .trim()
      .replace(/^["']|["']$/g, '');
    const nameRaw = item.text
      .slice(commaIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
      .trim();

    const codeNum = Number(codeRaw);
    parsedRows.push({
      lineNumber: item.lineNumber,
      studentCode: codeRaw.length === 0 ? Number.NaN : codeNum,
      name: nameRaw,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const domainIssues = validateStudentImportRows(
    parsedRows.map((r) => ({ studentCode: r.studentCode, name: r.name }))
  ).map((iss) => {
    if (iss.row !== undefined && parsedRows[iss.row - 1]) {
      return {
        ...iss,
        row: parsedRows[iss.row - 1]?.lineNumber,
      };
    }
    return iss;
  });

  if (domainIssues.length > 0) {
    return { ok: false, issues: domainIssues };
  }

  return {
    ok: true,
    rows: parsedRows.map((r) => ({ studentCode: r.studentCode, name: r.name })),
  };
}

/**
 * Prevents CSV formula injection by prepending a single quote to cells starting with =, +, -, or @.
 */
export function sanitizeCsvCell(value: string | number): string {
  const str = String(value);
  const safe = /^[=+\-@]/.test(str.trimStart()) ? `'${str}` : str;
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function serializeLeaderboardCsv(
  rows: ReadonlyArray<{
    rank: number;
    studentCode: number;
    name: string;
    level: number;
    totalPoints: number;
  }>
): string {
  const header = 'rank,studentCode,name,level,totalPoints';
  const body = rows.map((r) =>
    [
      sanitizeCsvCell(r.rank),
      sanitizeCsvCell(r.studentCode),
      sanitizeCsvCell(r.name),
      sanitizeCsvCell(r.level),
      sanitizeCsvCell(r.totalPoints),
    ].join(',')
  );
  return [header, ...body].join('\n');
}
