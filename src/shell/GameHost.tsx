import type { GameContext } from '../platform/types/manifest';
import { ClassCityModule } from '../games/classcity/ClassCityModule';

export interface GameHostProps {
  ctx: GameContext;
}

export function GameHost({ ctx }: GameHostProps) {
  return <ClassCityModule ctx={ctx} />;
}
