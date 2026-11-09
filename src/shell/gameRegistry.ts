import { classcityManifest } from '../games/classcity';
import type { GameManifest } from '../platform/types/manifest';
import type { GameId } from '../platform/types/models';

export const gameRegistry: readonly GameManifest[] = [classcityManifest];

export interface UpcomingGameCard {
  id: GameId;
  nameKey: string;
  descKey: string;
  accentColor: string;
}

export const upcomingGames: readonly UpcomingGameCard[] = [
  {
    id: 'classfarm',
    nameKey: 'game.classfarm.name',
    descKey: 'game.classfarm.desc',
    accentColor: '#22C55E',
  },
  {
    id: 'classarena',
    nameKey: 'game.classarena.name',
    descKey: 'game.classarena.desc',
    accentColor: '#F59E0B',
  },
  {
    id: 'classquest',
    nameKey: 'game.classquest.name',
    descKey: 'game.classquest.desc',
    accentColor: '#38BDF8',
  },
];

export function findGameManifest(id: GameId): GameManifest | undefined {
  return gameRegistry.find((m) => m.id === id);
}
