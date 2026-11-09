import type { Permission, Role } from './types/models';

const ALL_PERMISSIONS: readonly Permission[] = [
  'roster:read',
  'roster:write',
  'ledger:write',
  'class:manage',
  'game:configure',
  'export:data',
  'org:manage',
  'billing:manage',
];

/**
 * Single centralized mapping table from Role to Permissions (Rule 4.4b).
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  platform_admin: new Set(ALL_PERMISSIONS),
  org_owner: new Set(ALL_PERMISSIONS),
  org_admin: new Set([
    'roster:read',
    'roster:write',
    'ledger:write',
    'class:manage',
    'game:configure',
    'export:data',
    'org:manage',
  ]),
  teacher: new Set([
    'roster:read',
    'roster:write',
    'ledger:write',
    'class:manage',
    'game:configure',
    'export:data',
  ]),
  assistant: new Set(['roster:read', 'ledger:write', 'game:configure']),
  student: new Set(['roster:read']),
  guardian: new Set(['roster:read']),
};

export interface PermissionService {
  readonly role: Role;
  can(permission: Permission, scope?: string): boolean;
}

export function createPermissionService(
  role: Role = 'teacher',
  options?: { allowAllLocal?: boolean }
): PermissionService {
  const allowAllLocal = options?.allowAllLocal ?? true;
  return {
    role,
    can(permission: Permission, _scope?: string): boolean {
      if (allowAllLocal && role === 'teacher') {
        return true;
      }
      return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
    },
  };
}
