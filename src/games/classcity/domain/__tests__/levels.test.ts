import { describe, expect, it } from 'vitest';
import {
  calculateWonderProgress,
  levelFromPoints,
  needsPrefetch,
  progressToNext,
} from '../levels';
import {
  checkGiftBoxCollision,
  consumeDoublePointsPerk,
  pickRandomPerk,
  spawnGiftBoxes,
} from '../perks';
import {
  generateCityLayout,
  LOT_SIZE,
  MAX_BUILDING_HEIGHT,
  segmentIntersectsLotAABB,
} from '../../config/cityLayout';
import {
  INITIAL_VEHICLE_STATE,
  planAutoDrive,
  transitionVehicleState,
} from '../vehicleFsm';
import {
  filterStudents,
  findNearestLot,
  lotsByWaypoint,
  selectLeaderboard,
} from '../selectors';

function makeSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('GĐ2 Domain: levels.ts', () => {
  it('handles exact level boundaries (0, 4, 5, ..., ppl*19, >20) and negative points', () => {
    const ppl = 5;
    expect(levelFromPoints(-15, ppl)).toBe(1);
    expect(levelFromPoints(0, ppl)).toBe(1);
    expect(levelFromPoints(4, ppl)).toBe(1);
    expect(levelFromPoints(5, ppl)).toBe(2);
    expect(levelFromPoints(9, ppl)).toBe(2);
    expect(levelFromPoints(10, ppl)).toBe(3);
    // Level 19 boundary: 18 * 5 = 90 .. 94
    expect(levelFromPoints(89, ppl)).toBe(18);
    expect(levelFromPoints(90, ppl)).toBe(19);
    expect(levelFromPoints(94, ppl)).toBe(19);
    // Level 20 boundary: 19 * 5 = 95
    expect(levelFromPoints(95, ppl)).toBe(20);
    expect(levelFromPoints(500, ppl)).toBe(20);

    // Custom pointsPerLevel (e.g. 10)
    expect(levelFromPoints(9, 10)).toBe(1);
    expect(levelFromPoints(10, 10)).toBe(2);
    expect(levelFromPoints(190, 10)).toBe(20);
  });

  it('computes progressToNext and needsPrefetch accurately', () => {
    expect(progressToNext(0, 5)).toEqual({ current: 0, needed: 5, ratio: 0 });
    expect(progressToNext(3, 5)).toEqual({ current: 3, needed: 5, ratio: 0.6 });
    expect(progressToNext(95, 5)).toEqual({ current: 5, needed: 5, ratio: 1 });

    // Missing 3 points -> false; missing 2 or 1 point -> true; at level 20 -> false
    expect(needsPrefetch(2, 5)).toBe(false);
    expect(needsPrefetch(3, 5)).toBe(true);
    expect(needsPrefetch(4, 5)).toBe(true);
    expect(needsPrefetch(93, 5)).toBe(true);
    expect(needsPrefetch(94, 5)).toBe(true);
    expect(needsPrefetch(95, 5)).toBe(false);
  });

  it('computes Class Wonder progress and stage 1..6', () => {
    const start = calculateWonderProgress(0, 36, 5);
    expect(start.targetPoints).toBe(900);
    expect(start.stage).toBe(1);

    const mid = calculateWonderProgress(450, 36, 5);
    expect(mid.percent).toBe(50);
    expect(mid.stage).toBe(3);

    const full = calculateWonderProgress(950, 36, 5);
    expect(full.ratio).toBe(1);
    expect(full.stage).toBe(6);
  });
});

describe('GĐ2 Domain: cityLayout.ts (40 lots & geometric occlusion test)', () => {
  it('generates 40 non-overlapping lots with valid waypoint references', () => {
    const layout40 = generateCityLayout(40);
    expect(layout40.lots).toHaveLength(40);
    expect(layout40.emptyLots).toHaveLength(0);

    const layout36 = generateCityLayout(36);
    expect(layout36.lots).toHaveLength(36);
    expect(layout36.emptyLots).toHaveLength(4);

    // Every lot has a valid roadWaypointId in graph.nodes and graph.ringOrder
    for (const lot of layout40.lots) {
      expect(layout40.graph.nodes[lot.roadWaypointId]).toBeDefined();
      expect(layout40.graph.ringOrder).toContain(lot.roadWaypointId);
    }

    // No two lots overlap in 2D footprint (LOT_SIZE = 6)
    for (let i = 0; i < layout40.lots.length; i += 1) {
      for (let j = i + 1; j < layout40.lots.length; j += 1) {
        const a = layout40.lots[i]!;
        const b = layout40.lots[j]!;
        const overlapX =
          Math.abs(a.position[0] - b.position[0]) < LOT_SIZE - 1e-4;
        const overlapZ =
          Math.abs(a.position[2] - b.position[2]) < LOT_SIZE - 1e-4;
        expect(overlapX && overlapZ).toBe(false);
      }
    }
  });

  it('guarantees cameraFocus ray for every lot (1..40) is NOT occluded by any other Level-20 building (height 14)', () => {
    const { lots } = generateCityLayout(40);

    for (const targetLot of lots) {
      const camPos = targetLot.cameraFocus.position;
      const lookAt = targetLot.cameraFocus.lookAt;

      for (const otherLot of lots) {
        if (otherLot.id === targetLot.id) continue;
        const occluded = segmentIntersectsLotAABB(
          camPos,
          lookAt,
          otherLot,
          MAX_BUILDING_HEIGHT
        );
        expect(
          occluded,
          `Camera ray for lot #${targetLot.id} was occluded by lot #${otherLot.id}`
        ).toBe(false);
      }
    }
  });
});

describe('GĐ2 Domain: vehicleFsm.ts & planAutoDrive', () => {
  it('transitions vehicle FSM states deterministically', () => {
    let state = INITIAL_VEHICLE_STATE;
    state = transitionVehicleState(state, { type: 'START_MANUAL' });
    expect(state).toBe('manual');

    state = transitionVehicleState(state, { type: 'STOP_MANUAL' });
    expect(state).toBe('idle');

    state = transitionVehicleState(state, { type: 'START_AUTOPILOT' });
    expect(state).toBe('accelerating');

    state = transitionVehicleState(state, { type: 'ENTER_CRUISE' });
    expect(state).toBe('cruising');

    state = transitionVehicleState(state, { type: 'ENTER_DECEL' });
    expect(state).toBe('decelerating');

    state = transitionVehicleState(state, { type: 'PARKED' });
    expect(state).toBe('parked');

    state = transitionVehicleState(state, { type: 'CAMERA_ZOOM_START' });
    expect(state).toBe('cameraZoom');

    state = transitionVehicleState(state, { type: 'CALLOUT_OPENED' });
    expect(state).toBe('called');

    state = transitionVehicleState(state, { type: 'DISMISS_CALLOUT' });
    expect(state).toBe('idle');
  });

  it('plans deterministic 4-5s auto-drive that stops at exact parkingPoint and never repeats lastCalledLotId', () => {
    const { lots, graph } = generateCityLayout(36);
    const rng = makeSeededRng(123456);
    const calledHistory: Record<string, number> = {};

    let lastLotId: number | null = null;

    for (let run = 0; run < 30; run += 1) {
      const plan = planAutoDrive(graph, lots, calledHistory, rng, {
        lastCalledLotId: lastLotId,
      });

      // Duration strictly in 4000..5000 ms (4-5 seconds)
      expect(plan.durationMs).toBeGreaterThanOrEqual(4000);
      expect(plan.durationMs).toBeLessThanOrEqual(5000);

      // Must not repeat the immediately previous lot
      if (lastLotId !== null) {
        expect(plan.targetLotId).not.toBe(lastLotId);
      }

      // Check intermediate phases and final parked pose
      const startSample = plan.sampleAt(0);
      expect(startSample.phase).toBe('accelerating');

      const midSample = plan.sampleAt(plan.durationMs * 0.4);
      expect(midSample.phase).toBe('cruising');

      const decelSample = plan.sampleAt(plan.durationMs * 0.8);
      expect(decelSample.phase).toBe('decelerating');

      const endSample = plan.sampleAt(plan.durationMs);
      expect(endSample.phase).toBe('parked');
      expect(endSample.x).toBeCloseTo(plan.targetLot.parkingPoint[0], 5);
      expect(endSample.z).toBeCloseTo(plan.targetLot.parkingPoint[1], 5);
      expect(endSample.heading).toBeCloseTo(plan.targetLot.parkingHeading, 5);

      calledHistory[String(plan.targetLotId)] =
        (calledHistory[String(plan.targetLotId)] ?? 0) + 1;
      lastLotId = plan.targetLotId;
    }
  });
});

describe('GĐ2 Domain: perks.ts & selectors.ts', () => {
  it('spawns gift boxes on road waypoints, detects 2D collision, and consumes double_points perk', () => {
    const { graph } = generateCityLayout(36);
    const rng = makeSeededRng(99);
    const boxes = spawnGiftBoxes(graph, 3, rng);
    expect(boxes).toHaveLength(3);

    const firstBox = boxes[0]!;
    const hit = checkGiftBoxCollision(
      firstBox.position[0] + 0.5,
      firstBox.position[1] - 0.5,
      boxes
    );
    expect(hit?.id).toBe(firstBox.id);

    const miss = checkGiftBoxCollision(999, 999, boxes);
    expect(miss).toBeNull();

    const perk = pickRandomPerk(rng);
    expect(['double_points', 'ask_help', 'lucky_point']).toContain(perk);

    const consumed = consumeDoublePointsPerk(
      5,
      [
        {
          id: 'p1',
          kind: 'double_points',
          acquiredAt: '2026-11-01T00:00:00.000Z',
        },
      ],
      '2026-11-09T10:00:00.000Z'
    );
    expect(consumed.effectiveDelta).toBe(10);
    expect(consumed.consumedPerkId).toBe('p1');
    expect(consumed.updatedPerks[0]?.usedAt).toBe('2026-11-09T10:00:00.000Z');
  });

  it('finds nearest lot, groups lots by waypoint, and sorts/filters leaderboard', () => {
    const { lots } = generateCityLayout(36);
    const lot1 = lots[0]!;
    const nearest = findNearestLot(
      lots,
      lot1.parkingPoint[0] + 0.2,
      lot1.parkingPoint[1] - 0.2,
      5
    );
    expect(nearest?.id).toBe(lot1.id);

    const grouped = lotsByWaypoint(lots);
    expect(grouped[lot1.roadWaypointId]?.some((l) => l.id === lot1.id)).toBe(true);

    const roster = [
      {
        id: 's1',
        studentCode: 1,
        name: 'Nguyễn Minh Anh',
        totalPoints: 20,
        level: 5,
        shopBranch: 'bakery',
      },
      {
        id: 's2',
        studentCode: 2,
        name: 'Trần Gia Bảo',
        totalPoints: 45,
        level: 10,
        shopBranch: 'cafe',
      },
      {
        id: 's3',
        studentCode: 3,
        name: 'Lê Khánh Chi',
        totalPoints: 45,
        level: 10,
        shopBranch: 'bakery',
      },
    ];

    const top = selectLeaderboard(roster);
    expect(top.map((s) => s.id)).toEqual(['s2', 's3', 's1']);

    const filtered = filterStudents(roster, {
      query: 'bảo',
      branch: 'cafe',
      minLevel: 5,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('s2');
  });
});
