import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type {
  GameContext,
  GameHandle,
  GameManifest,
  GameModule,
} from '../../platform/types/manifest';

export const classcityManifest: GameManifest = {
  id: 'classcity',
  name: 'game.classcity.name',
  version: '0.1.0',
  minSdkVersion: '1.0.0',
  stateSchemaVersion: 1,
  requires: {
    permissions: ['roster:read'],
    entitlements: ['classcity.single_class'],
    webgl: true,
  },
  assets: {
    sharedIds: [
      'avatar_knight',
      'avatar_mage',
      'avatar_astronaut',
      'avatar_dino',
      'avatar_cat',
    ],
    gamePrefix: '/games/classcity/models/',
  },
  entry: async (): Promise<GameModule> => {
    const [{ ClassCityModule }, { useClassStore }] = await Promise.all([
      import('./ClassCityModule'),
      import('./state/useClassStore'),
    ]);

    return {
      mount(el: HTMLElement, initialCtx: GameContext): GameHandle {
        let activeCtx = initialCtx;
        const root = createRoot(el);

        const renderCurrent = () => {
          root.render(
            createElement(
              StrictMode,
              null,
              createElement(ClassCityModule, { ctx: activeCtx })
            )
          );
        };

        renderCurrent();

        return {
          onContextChange(next: Partial<GameContext>): void {
            activeCtx = { ...activeCtx, ...next };
            renderCurrent();
          },
          async unmount(): Promise<void> {
            useClassStore.setState({
              activeModal: 'none',
              activeAutoPlan: null,
              vehicleState: 'idle',
            });
            // Defer nested root unmount outside the host React commit phase so R3F <Html> sub-roots unmount cleanly
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 0);
            });
            root.unmount();
          },
        };
      },
    };
  },
};
