import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import type { AssetService } from '../../../../platform/assets/assetService';
import type { Lot } from '../../config/cityLayout';
import { useClassStore } from '../../state/useClassStore';
import { Avatar3D } from './Avatar3D';
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
          castShadow={castShadow && student.level >= 12}
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
          showBlobShadow={isNearCamera || isSelected || isCalled}
          assets={assets}
        />
      </group>
    </LotErrorBoundary>
  );
}
