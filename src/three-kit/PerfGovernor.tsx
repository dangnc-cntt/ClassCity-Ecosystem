import { useEffect, useRef } from 'react';
import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';

export interface PerfGovernorProps {
  lowPowerMode?: boolean;
  onQualityChange?: (tier: 'high' | 'medium' | 'low') => void;
  onLowFpsDetected?: (fps: number) => void;
}

/**
 * Monitors 3D frame rate and renderer draw calls (Rule 8.5 & 8.9).
 * Automatically steps down DPR when frame rate drops or when lowPowerMode is enabled.
 */
export function PerfGovernor({
  lowPowerMode = false,
  onQualityChange,
  onLowFpsDetected,
}: PerfGovernorProps) {
  const setDpr = useThree((s) => s.setDpr);
  const gl = useThree((s) => s.gl);
  const qualityRef = useRef<'high' | 'medium' | 'low'>('high');

  useEffect(() => {
    if (lowPowerMode) {
      qualityRef.current = 'low';
      setDpr(1);
      onQualityChange?.('low');
    } else {
      qualityRef.current = 'high';
      setDpr(Math.min(1.5, typeof window !== 'undefined' ? window.devicePixelRatio : 1.25));
      onQualityChange?.('high');
    }
  }, [lowPowerMode, setDpr, onQualityChange]);

  // Periodically log draw calls and triangle counts in DEV (Rule 8.9)
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    const timer = setInterval(() => {
      const { calls, triangles } = gl.info.render;
      if (calls > 0) {
        console.debug(
          `[PerfGovernor] drawCalls=${calls}, triangles=${triangles}, tier=${qualityRef.current}`
        );
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [gl]);

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
