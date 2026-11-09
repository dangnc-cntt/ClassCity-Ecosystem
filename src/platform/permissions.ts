import type { Permission, Role } from './types/models';

export interface PermissionService {
  readonly role: Role;
  can(permission: Permission, scope?: string): boolean;
}

export function createPermissionService(role: Role = 'teacher'): PermissionService {
  return {
    role,
    can(): boolean {
      return true;
    },
  };
}
