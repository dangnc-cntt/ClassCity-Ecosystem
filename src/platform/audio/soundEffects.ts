import type { EcosystemEventBus } from '../eventBus';

export interface SoundEffectsService {
  readonly isMuted: boolean;
  setMuted(muted: boolean): void;
  playEngineTick(): void;
  playHorn(): void;
  playFanfare(): void;
  playPointAward(delta: number): void;
  playGiftOpen(): void;
  dispose(): Promise<void>;
}

/**
 * Pure Web Audio API procedural sound effects synthesizer (Rule 6.6).
 * Lazily creates AudioContext on first sound trigger to respect browser autoplay policies.
 */
export function createSoundEffects(options?: {
  initialMuted?: boolean;
  bus?: EcosystemEventBus;
}): SoundEffectsService {
  let muted = options?.initialMuted ?? false;
  let audioCtx: AudioContext | null = null;
  let disposed = false;

  const unsubBus = options?.bus?.on('AUDIO:MUTE_CHANGED', (evt) => {
    muted = evt.payload.muted;
  });

  const ensureContext = (): AudioContext | null => {
    if (disposed || muted) return null;
    if (audioCtx) {
      if (audioCtx.state === 'suspended') {
        void audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
      return audioCtx;
    } catch {
      return null;
    }
  };

  const playTone = (
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    startOffsetSec = 0,
    gainPeak = 0.12
  ): void => {
    const ctx = ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + startOffsetSec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec + 0.02);
    } catch {
      // Ignore audio synthesis errors on restricted devices
    }
  };

  return {
    get isMuted(): boolean {
      return muted;
    },

    setMuted(next: boolean): void {
      if (muted === next) return;
      muted = next;
      options?.bus?.publish('AUDIO:MUTE_CHANGED', { muted: next });
    },

    playEngineTick(): void {
      playTone(180, 0.04, 'triangle', 0, 0.06);
    },

    playHorn(): void {
      playTone(440, 0.14, 'square', 0, 0.1);
      playTone(554.37, 0.22, 'square', 0.15, 0.12);
    },

    playFanfare(): void {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        playTone(freq, 0.22, 'triangle', i * 0.1, 0.14);
      });
    },

    playPointAward(delta: number): void {
      if (delta > 0) {
        const base = delta >= 5 ? 659.25 : delta >= 2 ? 587.33 : 523.25;
        playTone(base, 0.12, 'sine', 0, 0.12);
        playTone(base * 1.25, 0.18, 'sine', 0.08, 0.14);
      } else if (delta < 0) {
        playTone(196, 0.18, 'sawtooth', 0, 0.08);
        playTone(146.83, 0.22, 'sawtooth', 0.12, 0.08);
      }
    },

    playGiftOpen(): void {
      playTone(587.33, 0.1, 'sine', 0, 0.12);
      playTone(783.99, 0.12, 'sine', 0.09, 0.12);
      playTone(1174.66, 0.25, 'triangle', 0.18, 0.15);
    },

    async dispose(): Promise<void> {
      if (disposed) return;
      disposed = true;
      unsubBus?.();
      if (audioCtx) {
        try {
          await audioCtx.close();
        } catch {
          // Ignore close errors
        }
        audioCtx = null;
      }
    },
  };
}
