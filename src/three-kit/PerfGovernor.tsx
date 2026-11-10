import { useEffect, useRef } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';

export interface ClassCityPerfMetrics {
  fps: number;
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  tier: 'high' | 'medium' | 'low';
}

declare global {
  interface Window {
    __CLASSCITY_METRICS__?: ClassCityPerfMetrics;
  }
}

export interface PerfGovernorProps {
  lowPowerMode?: boolean;
  onQualityChange?: (tier: 'high' | 'medium' | 'low') => void;
  onLowFpsDetected?: (fps: number) => void;
}

/**
 * Monitors 3D frame rate and renderer draw calls (Rule 8.5 & 8.9).
 * Automatically steps down DPR when frame rate drops or when lowPowerMode is enabled,
 * and exposes `window.__CLASSCITY_METRICS__` in DEV / `?dev=1` mode for budget verification.
 */
export function PerfGovernor({
  lowPowerMode = false,
  onQualityChange,
  onLowFpsDetected,
}: PerfGovernorProps) {
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  const qualityRef = useRef<'high' | 'medium' | 'low'>('high');
  const fpsAccumRef = useRef({ frames: 0, elapsed: 0, fps: 60 });

  const enableDiagnostics =
    Boolean(import.meta.env?.DEV) ||
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('dev') === '1');

  useEffect(() => {
    if (lowPowerMode) {
      qualityRef.current = 'low';
      setDpr(1);
      onQualityChange?.('low');
    } else {
      qualityRef.current = 'high';
      setDpr(
        Math.min(
          1.5,
          typeof window !== 'undefined' ? window.devicePixelRatio : 1.25
        )
      );
      onQualityChange?.('high');
    }
  }, [lowPowerMode, setDpr, onQualityChange]);

  // Sample completed frame's `gl.info.render` before R3F's next `gl.render()` auto-reset
  useFrame((_, delta) => {
    if (!enableDiagnostics) return;
    const acc = fpsAccumRef.current;
    acc.frames += 1;
    acc.elapsed += delta;
    if (acc.elapsed >= 0.5) {
      acc.fps = Math.round(acc.frames / acc.elapsed);
      acc.frames = 0;
      acc.elapsed = 0;
    }

    const { calls, triangles } = gl.info.render;
    const { geometries, textures } = gl.info.memory;
    if (calls > 0 && typeof window !== 'undefined') {
      window.__CLASSCITY_METRICS__ = {
        fps: acc.fps,
        calls,
        triangles,
        geometries,
        textures,
        tier: qualityRef.current,
      };
    }
  });

  // Periodically log draw calls and triangle counts in DEV (Rule 8.9)
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    const timer = setInterval(() => {
      const m = typeof window !== 'undefined' ? window.__CLASSCITY_METRICS__ : undefined;
      if (m && m.calls > 0) {
        console.debug(
          `[PerfGovernor] fps=${m.fps}, drawCalls=${m.calls}, triangles=${m.triangles}, geom=${m.geometries}, tex=${m.textures}, tier=${m.tier}`
        );
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PerformanceMonitor
      onDecline={({ fps }) => {
        if (lowPowerMode) return;
        if (qualityRef.current === 'high') {
          qualityRef.current = 'medium';
          setDpr(1.1);
          onQualityChange?.('medium');
        } else if (qualityRef.current === 'medium') {
          qualityRef.current = 'low';
          setDpr(1);
          onQualityChange?.('low');
          onLowFpsDetected?.(fps);
        }
      }}
      onIncline={() => {
        if (lowPowerMode) return;
        if (qualityRef.current === 'low') {
          qualityRef.current = 'medium';
          setDpr(1.2);
          onQualityChange?.('medium');
        } else if (qualityRef.current === 'medium') {
          qualityRef.current = 'high';
          setDpr(1.5);
          onQualityChange?.('high');
        }
      }}
    />
  );
}
