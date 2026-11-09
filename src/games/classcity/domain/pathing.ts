import type { WaypointGraph } from '../config/cityLayout';

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Smooth acceleration -> cruise -> easeOut deceleration curve over t in [0, 1].
 */
export function autoPilotProgressCurve(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  // Smoothstep-like S-curve with gentle ease-in and longer ease-out tail
  if (u < 0.2) {
    // Accelerating phase (0 -> 0.2)
    return 2.0 * u * u;
  }
  if (u < 0.65) {
    // Cruising phase (0.2 -> 0.65)
    return 0.08 + (u - 0.2) * 1.4;
  }
  // Decelerating ease-out phase (0.65 -> 1.0)
  const rem = (u - 0.65) / 0.35;
  const eased = 1 - Math.pow(1 - rem, 3);
  return 0.71 + eased * 0.29;
}

export interface PolylineSegment {
  from: [number, number];
  to: [number, number];
  length: number;
  cumulativeStart: number;
  cumulativeEnd: number;
  heading: number;
}

export interface PolylineMetrics {
  points: Array<[number, number]>;
  segments: PolylineSegment[];
  totalLength: number;
}

export function buildPolylineMetrics(
  points: ReadonlyArray<[number, number]>
): PolylineMetrics {
  const cleanPoints: Array<[number, number]> = points.map((p) => [p[0], p[1]]);
  const segments: PolylineSegment[] = [];
  let totalLength = 0;

  for (let i = 0; i < cleanPoints.length - 1; i += 1) {
    const from = cleanPoints[i]!;
    const to = cleanPoints[i + 1]!;
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    const heading = Math.atan2(dz, dx);
    segments.push({
      from,
      to,
      length: len,
      cumulativeStart: totalLength,
      cumulativeEnd: totalLength + len,
      heading,
    });
    totalLength += len;
  }

  return {
    points: cleanPoints,
    segments,
    totalLength,
  };
}

export interface SampledPose {
  x: number;
  z: number;
  heading: number;
}

/**
 * Interpolates position and heading at normalized distance ratio in [0, 1] along a polyline.
 */
export function samplePolylineAtDistanceRatio(
  metrics: PolylineMetrics,
  distanceRatio: number,
  finalHeading?: number
): SampledPose {
  if (metrics.points.length === 0) {
    return { x: 0, z: 0, heading: finalHeading ?? 0 };
  }
  if (metrics.segments.length === 0 || metrics.totalLength <= 1e-6) {
    const last = metrics.points[metrics.points.length - 1]!;
    return { x: last[0], z: last[1], heading: finalHeading ?? 0 };
  }

  const clamped = Math.min(1, Math.max(0, distanceRatio));
  if (clamped >= 1) {
    const lastSeg = metrics.segments[metrics.segments.length - 1]!;
    return {
      x: lastSeg.to[0],
      z: lastSeg.to[1],
      heading: finalHeading ?? lastSeg.heading,
    };
  }

  const targetDist = clamped * metrics.totalLength;
  const seg =
    metrics.segments.find(
      (s) => targetDist >= s.cumulativeStart && targetDist <= s.cumulativeEnd
    ) ?? metrics.segments[metrics.segments.length - 1]!;

  const localT =
    seg.length > 1e-6 ? (targetDist - seg.cumulativeStart) / seg.length : 1;
  const x = seg.from[0] + (seg.to[0] - seg.from[0]) * localT;
  const z = seg.from[1] + (seg.to[1] - seg.from[1]) * localT;

  let heading = seg.heading;
  // Blend smoothly into finalHeading during the last 12% of the path
  if (finalHeading !== undefined && clamped > 0.88) {
    const blend = (clamped - 0.88) / 0.12;
    const diff = normalizeAngleDiff(finalHeading - seg.heading);
    heading = seg.heading + diff * blend;
  }

  return { x, z, heading };
}

export function normalizeAngleDiff(angleRad: number): number {
  let diff = ((angleRad + Math.PI) % (2 * Math.PI)) - Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Builds a sequence of 2D waypoints along `graph.ringOrder` from `startWaypointId` to `targetWaypointId`,
 * ensuring at least `minSteps` segments so the car takes a scenic drive around the city.
 */
export function buildRingRoute(
  graph: WaypointGraph,
  startWaypointId: string,
  targetWaypointId: string,
  minSteps = 14
): Array<[number, number]> {
  const order = graph.ringOrder;
  if (order.length === 0) return [];

  let startIdx = order.indexOf(startWaypointId);
  if (startIdx < 0) startIdx = 0;

  let targetIdx = order.indexOf(targetWaypointId);
  if (targetIdx < 0) targetIdx = 0;

  const result: Array<[number, number]> = [];
  let steps = 0;
  let idx = startIdx;

  while (steps < minSteps || idx !== targetIdx) {
    const wpId = order[idx];
    const coords = wpId ? graph.nodes[wpId] : undefined;
    if (coords) {
      result.push([coords[0], coords[1]]);
    }
    idx = (idx + 1) % order.length;
    steps += 1;
    // Safety cap
    if (steps > order.length * 3) break;
  }

  const endWpId = order[targetIdx];
  const endCoords = endWpId ? graph.nodes[endWpId] : undefined;
  if (endCoords) {
    result.push([endCoords[0], endCoords[1]]);
  }

  return result;
}
