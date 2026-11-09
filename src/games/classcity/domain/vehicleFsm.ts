import type { Lot, WaypointGraph } from '../config/cityLayout';
import {
  autoPilotProgressCurve,
  buildPolylineMetrics,
  buildRingRoute,
  samplePolylineAtDistanceRatio,
  type PolylineMetrics,
  type SampledPose,
} from './pathing';

export type VehicleState =
  | 'idle'
  | 'manual'
  | 'accelerating'
  | 'cruising'
  | 'decelerating'
  | 'parked'
  | 'cameraZoom'
  | 'called';

export type VehicleEvent =
  | { type: 'START_MANUAL' }
  | { type: 'STOP_MANUAL' }
  | { type: 'START_AUTOPILOT' }
  | { type: 'ENTER_CRUISE' }
  | { type: 'ENTER_DECEL' }
  | { type: 'PARKED' }
  | { type: 'CAMERA_ZOOM_START' }
  | { type: 'CALLOUT_OPENED' }
  | { type: 'DISMISS_CALLOUT' };

export const INITIAL_VEHICLE_STATE: VehicleState = 'idle';

/**
 * Pure FSM transition function for the patrol vehicle (Rule 6.4).
 */
export function transitionVehicleState(
  current: VehicleState,
  event: VehicleEvent
): VehicleState {
  switch (event.type) {
    case 'START_MANUAL':
      return current === 'idle' || current === 'manual' ? 'manual' : current;
    case 'STOP_MANUAL':
      return current === 'manual' ? 'idle' : current;
    case 'START_AUTOPILOT':
      return current === 'idle' || current === 'manual'
        ? 'accelerating'
        : current;
    case 'ENTER_CRUISE':
      return current === 'accelerating' ? 'cruising' : current;
    case 'ENTER_DECEL':
      return current === 'accelerating' || current === 'cruising'
        ? 'decelerating'
        : current;
    case 'PARKED':
      return current === 'accelerating' ||
        current === 'cruising' ||
        current === 'decelerating'
        ? 'parked'
        : current;
    case 'CAMERA_ZOOM_START':
      return current === 'parked' ? 'cameraZoom' : current;
    case 'CALLOUT_OPENED':
      return current === 'cameraZoom' || current === 'parked'
        ? 'called'
        : current;
    case 'DISMISS_CALLOUT':
      return 'idle';
    default:
      return current;
  }
}

export interface AutoDriveSample extends SampledPose {
  phase: 'accelerating' | 'cruising' | 'decelerating' | 'parked';
  normalizedTime: number;
}

export interface AutoDrivePlan {
  targetLot: Lot;
  targetLotId: number;
  targetParkingPoint: [number, number];
  targetParkingHeading: number;
  durationMs: number;
  waypoints: Array<[number, number]>;
  metrics: PolylineMetrics;
  sampleAt(elapsedMs: number): AutoDriveSample;
}

export interface PlanAutoDriveOptions {
  startPosition?: [number, number];
  startWaypointId?: string;
  lastCalledLotId?: number | null;
}

/**
 * Pure, deterministic Auto-Pilot planner (Rule 6.4):
 * - Selects a target lot with inverse-call-count weighting (`1 / (1 + count * 2)`),
 *   excluding `lastCalledLotId` when `lots.length > 1`.
 * - Plans a 4000..5000 ms route along `graph.ringOrder` ending at the exact `parkingPoint`
 *   and `parkingHeading` of the chosen lot.
 */
export function planAutoDrive(
  graph: WaypointGraph,
  lots: readonly Lot[],
  calledHistory: Record<string, number>,
  rng: () => number,
  options?: PlanAutoDriveOptions
): AutoDrivePlan {
  if (lots.length === 0) {
    throw new Error('Cannot plan Auto-Drive with an empty lot list.');
  }

  const candidates =
    lots.length > 1 && options?.lastCalledLotId != null
      ? lots.filter((l) => l.id !== options.lastCalledLotId)
      : [...lots];

  const pool = candidates.length > 0 ? candidates : [...lots];

  // Weighted random pick: fewer previous calls => higher weight
  const weights = pool.map((lot) => {
    const count = calledHistory[String(lot.id)] ?? 0;
    return 1 / (1 + Math.max(0, count) * 2);
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let pickThreshold = rng() * totalWeight;
  let chosenLot = pool[pool.length - 1]!;

  for (let i = 0; i < pool.length; i += 1) {
    const w = weights[i] ?? 0;
    if (pickThreshold <= w) {
      chosenLot = pool[i]!;
      break;
    }
    pickThreshold -= w;
  }

  const startWp =
    options?.startWaypointId ??
    graph.ringOrder[0] ??
    chosenLot.roadWaypointId;

  const routePoints = buildRingRoute(
    graph,
    startWp,
    chosenLot.roadWaypointId,
    14
  );

  if (options?.startPosition) {
    const first = routePoints[0];
    if (
      !first ||
      Math.hypot(
        first[0] - options.startPosition[0],
        first[1] - options.startPosition[1]
      ) > 0.1
    ) {
      routePoints.unshift([
        options.startPosition[0],
        options.startPosition[1],
      ]);
    }
  }

  // Ensure exact final point is chosenLot.parkingPoint
  const lastPt = routePoints[routePoints.length - 1];
  if (
    !lastPt ||
    lastPt[0] !== chosenLot.parkingPoint[0] ||
    lastPt[1] !== chosenLot.parkingPoint[1]
  ) {
    routePoints.push([
      chosenLot.parkingPoint[0],
      chosenLot.parkingPoint[1],
    ]);
  }

  // Duration between 4000 ms and 5000 ms
  const durationMs = Math.round(4000 + rng() * 1000);
  const metrics = buildPolylineMetrics(routePoints);

  return {
    targetLot: chosenLot,
    targetLotId: chosenLot.id,
    targetParkingPoint: [
      chosenLot.parkingPoint[0],
      chosenLot.parkingPoint[1],
    ],
    targetParkingHeading: chosenLot.parkingHeading,
    durationMs,
    waypoints: routePoints,
    metrics,
    sampleAt(elapsedMs: number): AutoDriveSample {
      if (elapsedMs >= durationMs) {
        return {
          x: chosenLot.parkingPoint[0],
          z: chosenLot.parkingPoint[1],
          heading: chosenLot.parkingHeading,
          phase: 'parked',
          normalizedTime: 1,
        };
      }

      const normT = Math.max(0, elapsedMs / durationMs);
      const distRatio = autoPilotProgressCurve(normT);
      const pose = samplePolylineAtDistanceRatio(
        metrics,
        distRatio,
        chosenLot.parkingHeading
      );

      let phase: AutoDriveSample['phase'] = 'cruising';
      if (normT < 0.2) phase = 'accelerating';
      else if (normT >= 0.65) phase = 'decelerating';

      return {
        ...pose,
        phase,
        normalizedTime: normT,
      };
    },
  };
}
