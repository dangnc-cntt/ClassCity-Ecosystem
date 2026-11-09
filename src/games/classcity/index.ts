import { createRoot } from 'react-dom/client';
import { createElement, StrictMode } from 'react';
import type { GameContext, GameHandle, GameManifest, GameModule } from '../../platform/types/manifest';
import { ClassCityModule } from './ClassCityModule';

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
  entry: async () => classcityModule,
};

export const classcityModule: GameModule = {
  mount(el: HTMLElement, ctx: GameContext): GameHandle {
    const root = createRoot(el);
    root.render(
      createElement(StrictMode, null, createElement(ClassCityModule, { ctx }))
    );
    return {
      async unmount(): Promise<void> {
        root.unmount();
      },
    };
  },
};
