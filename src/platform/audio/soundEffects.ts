export interface SoundEffectsService {
  readonly isMuted: boolean;
  setMuted(muted: boolean): void;
  dispose(): Promise<void>;
}

export function createSoundEffects(): SoundEffectsService {
  let muted = false;
  return {
    get isMuted() {
      return muted;
    },
    setMuted(next: boolean) {
      muted = next;
    },
    async dispose() {},
  };
}
