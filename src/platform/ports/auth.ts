import type { SessionUser } from '../types/models';

export interface AuthPort {
  getCurrentUser(): Promise<SessionUser>;
}
