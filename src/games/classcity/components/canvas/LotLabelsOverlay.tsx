import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useClassStore } from '../../state/useClassStore';
import { getProceduralShopHeight } from './ShopProcedural';

const _worldVec = new THREE.Vector3();
const NEAR_LABEL_DIST_SQ = 38 * 38;

export interface LotLabelsOverlayProps {
  cameraRef: RefObject<THREE.Camera | null>;
}

/**
 * Single compositor-driven 2D overlay projecting 3D rooftop lot labels via `translate3d` (Rule 8.4 & R4).
 * Replaces 36 separate `@react-three/drei` `<Html>` roots with a single RAF projection pass,
 * eliminating nested root unmount races in React 19 and avoiding per-frame React re-renders.
 */
export function LotLabelsOverlay({ cameraRef }: LotLabelsOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fullBadgeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const compactBadgeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const {
    students,
    lots,
    selectedStudentId,
    hoveredLotId,
    calledStudentId,
    lowPowerMode,
  } = useClassStore(
    useShallow((s) => ({
      students: s.students,
      lots: s.layout.lots,
      selectedStudentId: s.selectedStudentId,
      hoveredLotId: s.hoveredLotId,
      calledStudentId: s.calledStudentId,
      lowPowerMode: s.lowPowerMode,
    }))
  );

  // Keep latest reactive snapshot in a ref so the RAF loop never restarts unnecessarily
  const snapshotRef = useRef({
    students,
    lots,
    selectedStudentId,
    hoveredLotId,
    calledStudentId,
    lowPowerMode,
  });
  snapshotRef.current = {
    students,
    lots,
    selectedStudentId,
    hoveredLotId,
    calledStudentId,
    lowPowerMode,
  };

  useEffect(() => {
    let rafId = 0;

    const updatePositions = () => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (container && camera) {
        // Hide rooftop labels when the camera dips below the island (they would show through the soil)
        container.style.visibility = camera.position.y < 1 ? 'hidden' : 'visible';
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (width > 0 && height > 0) {
          const halfW = width * 0.5;
          const halfH = height * 0.5;
          const cx = camera.position.x;
          const cy = camera.position.y;
          const cz = camera.position.z;

          const snap = snapshotRef.current;
          for (const stu of snap.students) {
            const el = itemRefs.current.get(stu.id);
            if (!el) continue;

            const lot = snap.lots.find((l) => l.id === stu.lotNumber);
            if (!lot) {
              el.style.opacity = '0';
              continue;
            }

            const labelY = getProceduralShopHeight(stu.level) + 2.55;
            _worldVec.set(lot.position[0], labelY, lot.position[2]);
            _worldVec.project(camera);

            // Hide if behind the camera near/far clip plane
            if (_worldVec.z < -1 || _worldVec.z > 1) {
              el.style.opacity = '0';
              continue;
            }

            const sx = _worldVec.x * halfW + halfW;
            const sy = -_worldVec.y * halfH + halfH;
            el.style.opacity = '1';
            el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;

            const dx = lot.position[0] - cx;
            const dy = lot.position[1] - cy;
            const dz = lot.position[2] - cz;
            const isNear =
              !snap.lowPowerMode &&
              dx * dx + dy * dy + dz * dz <= NEAR_LABEL_DIST_SQ;
            const showFull =
              snap.selectedStudentId === stu.id ||
              snap.calledStudentId === stu.id ||
              snap.hoveredLotId === lot.id ||
              isNear;

            const fullEl = fullBadgeRefs.current.get(stu.id);
            const compactEl = compactBadgeRefs.current.get(stu.id);
            if (fullEl && compactEl) {
              fullEl.style.display = showFull ? 'flex' : 'none';
              compactEl.style.display = showFull ? 'none' : 'inline-flex';
            }
          }
        }
      }
      rafId = requestAnimationFrame(updatePositions);
    };

    rafId = requestAnimationFrame(updatePositions);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [cameraRef]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
    >
      {students.map((student) => {
        const isHighlighted =
          selectedStudentId === student.id || calledStudentId === student.id;
        return (
          <div
            key={student.id}
            ref={(el) => {
              if (el) itemRefs.current.set(student.id, el);
              else itemRefs.current.delete(student.id);
            }}
            style={{ opacity: 0, left: 0, top: 0 }}
            className="absolute will-change-transform"
          >
            <div
              ref={(el) => {
                if (el) fullBadgeRefs.current.set(student.id, el);
                else fullBadgeRefs.current.delete(student.id);
              }}
              style={{ display: isHighlighted ? 'flex' : 'none' }}
              className={
                isHighlighted
                  ? 'items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-amber-300 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-md'
                  : 'items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-slate-100'
              }
            >
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-extrabold text-white tabular-nums">
                {student.studentCode}
              </span>
              <span>{student.name}</span>
              <span className="rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300 tabular-nums">
                Lv.{student.level}
              </span>
            </div>

            <div
              ref={(el) => {
                if (el) compactBadgeRefs.current.set(student.id, el);
                else compactBadgeRefs.current.delete(student.id);
              }}
              style={{ display: isHighlighted ? 'none' : 'inline-flex' }}
              className="h-5 min-w-5 items-center justify-center rounded-full border border-teal-400/50 bg-slate-900/90 px-1.5 text-[11px] font-extrabold text-teal-200 shadow-sm tabular-nums"
            >
              {student.studentCode}
            </div>
          </div>
        );
      })}
    </div>
  );
}
