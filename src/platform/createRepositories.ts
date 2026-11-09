import type { RepositoryBundle } from './ports/repositories';

export function createRepositories(adapter: RepositoryBundle): RepositoryBundle {
  return adapter;
}
