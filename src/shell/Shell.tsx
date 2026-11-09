import { GameHost } from './GameHost';
import { EcosystemDevPanel } from './EcosystemDevPanel';

export function Shell() {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <GameHost />
      <EcosystemDevPanel />
    </div>
  );
}
