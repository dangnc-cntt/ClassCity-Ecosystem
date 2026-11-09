import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { AssetService } from '../../../../platform/assets/assetService';
import type { Lot } from '../../config/cityLayout';
import { useClassStore } from '../../state/useClassStore';
import { Avatar3D } from './Avatar3D';
import { getProceduralShopHeight } from './ShopProcedural';
import { ShopModel } from './ShopModel';

const selectionRingGeom = new THREE.RingGeometry(3.05, 3.35, 32);
const selectionRingMat = new THREE.MeshBasicMaterial({
  color: '#2DD4BF',
  side: THREE.DoubleSide,
});

interface LotErrorBoundaryProps {
  lotId: number;
  children: ReactNode;
}

interface LotErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isolates rendering errors to a single StudentLot so one faulty model never crashes the city (Rule 9).
 */
class LotErrorBoundary extends Component<
  LotErrorBoundaryProps,
  LotErrorBoundaryState
> {
  override state: LotErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LotErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env?.DEV) {
      console.debug(`[LotErrorBoundary] Lot #${this.props.lotId}`, error, info);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export interface StudentLotProps {
  lot: Lot;
  studentId: string;
  isNearCamera: boolean;
  assets?: AssetService;
  castShadow?: boolean;
}

/**
 * Renders an individual student's lot, 3D shop, and optimized floating HTML label (Rule 8.4 & 8.8).
 * Uses a narrow `useShallow` selector so awarding points to 1 student only re-renders that 1 lot.
 */
export function StudentLot({
  lot,
  studentId,
  isNearCamera,
  assets,
  castShadow = true,
}: StudentLotProps) {
  const {
    student,
    isSelected,
    isHovered,
    isCalled,
    jumpTimestamp,
    selectStudent,
    setHoveredLotId,
  } = useClassStore(
    useShallow((state) => {
      const found = state.students.find((s) => s.id === studentId);
      const lastAward = state.lastAwardedStudent;
      return {
        student: found,
        isSelected: state.selectedStudentId === studentId,
        isHovered: state.hoveredLotId === lot.id,
        isCalled: state.calledStudentId === studentId,
        jumpTimestamp:
          lastAward && lastAward.studentId === studentId
            ? lastAward.timestamp
            : 0,
        selectStudent: state.selectStudent,
        setHoveredLotId: state.setHoveredLotId,
      };
    })
  );

  if (!student) return null;

  const showFullLabel = isSelected || isHovered || isCalled || isNearCamera;
  const labelHeight = getProceduralShopHeight(student.level) + 2.55;

  return (
    <LotErrorBoundary lotId={lot.id}>
      <group
        position={lot.position}
        rotation={[0, lot.rotationY, 0]}
        onClick={(e) => {
          e.stopPropagation();
          selectStudent(student.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredLotId(lot.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredLotId(null);
        }}
      >
        {(isSelected || isCalled) && (
          <mesh
            geometry={selectionRingGeom}
            material={selectionRingMat}
            position={[0, 0.06, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          />
        )}

        <ShopModel
          level={student.level}
          branch={student.shopBranch}
          color={student.shopColor}
          assets={assets}
          castShadow={castShadow}
        />

        <Avatar3D
          studentId={student.id}
          avatarId={student.equippedAvatarId}
          patrolA={lot.sidewalkPatrol.a}
          patrolB={lot.sidewalkPatrol.b}
          lotPosition={lot.position}
          lotRotationY={lot.rotationY}
          jumpTriggerTimestamp={jumpTimestamp}
          isCalled={isCalled}
          assets={assets}
        />

        {/* Optimized HTML label: no backdrop-filter/blur, pointer-events:none (Rule 8.4) */}
        <Html
          position={[0, labelHeight, 0]}
          center
          distanceFactor={32}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {showFullLabel ? (
            <div
              className={
                isSelected || isCalled
                  ? 'flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-amber-300 bg-slate-900 px-2.5 py-1 text-xs font-bold text-white shadow-md'
                  : 'flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-700 bg-slate-900/95 px-2 py-0.5 text-[11px] font-semibold text-slate-100'
              }
            >
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-extrabold text-white">
                {student.studentCode}
              </span>
              <span>{student.name}</span>
              <span className="rounded bg-amber-500/20 px-1 text-[10px] font-bold text-amber-300">
                Lv.{student.level}
              </span>
            </div>
          ) : (
            <div className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-1.5 text-[10px] font-bold text-slate-200">
              {student.studentCode}
            </div>
          )}
        </Html>
      </group>
    </LotErrorBoundary>
  );
}
