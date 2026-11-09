import type { SessionUser } from '../types/models';

export interface AuthPort {
  getCurrentUser(): Promise<SessionUser>;
}

export const DEFAULT_SESSION_USER: SessionUser = {
  userId: 'local-teacher',
  orgId: 'local',
  role: 'teacher',
  displayName: 'Giáo viên',
};

export function createLocalAuthPort(user: SessionUser = DEFAULT_SESSION_USER): AuthPort {
  return {
    async getCurrentUser(): Promise<SessionUser> {
      return user;
    },
  };
}
