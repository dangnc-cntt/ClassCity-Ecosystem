import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useClassStore } from '../../state/useClassStore';

const GIFT_GEOM = {
  cube: new THREE.BoxGeometry(1.05, 1.05, 1.05),
  ribbonH: new THREE.BoxGeometry(1.1, 1.1, 0.22),
  ribbonV: new THREE.BoxGeometry(0.22, 1.1, 1.1),
  bowLoop: new THREE.TorusGeometry(0.2, 0.055, 8, 16),
  glowRing: new THREE.RingGeometry(0.68, 0.9, 24),
  sparkle: new THREE.OctahedronGeometry(0.18, 0),
};

const GIFT_MAT = {
  boxBody: new THREE.MeshStandardMaterial({
    color: '#EC4899',
    roughness: 0.35,
    metalness: 0.15,
  }),
  goldRibbon: new THREE.MeshStandardMaterial({
    color: '#FDE047',
    emissive: '#F59E0B',
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.5,
  }),
  glow: new THREE.MeshBasicMaterial({
    color: '#FDE047',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
  }),
};

interface SingleGiftBoxProps {
  position: [number, number];
  index: number;
}

function SingleGiftBox({ position, index }: SingleGiftBoxProps) {
  const meshGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const grp = meshGroupRef.current;
    if (!grp) return;
    const t = clock.elapsedTime + index * 1.7;
    grp.rotation.y = t * 1.6;
    grp.position.y = 0.85 + Math.sin(t * 2.8) * 0.2;
  });

  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh
        geometry={GIFT_GEOM.glowRing}
        material={GIFT_MAT.glow}
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <group ref={meshGroupRef} position={[0, 0.85, 0]}>
        <mesh geometry={GIFT_GEOM.cube} material={GIFT_MAT.boxBody} />
        <mesh geometry={GIFT_GEOM.ribbonH} material={GIFT_MAT.goldRibbon} />
        <mesh geometry={GIFT_GEOM.ribbonV} material={GIFT_MAT.goldRibbon} />
        <mesh
          geometry={GIFT_GEOM.bowLoop}
          material={GIFT_MAT.goldRibbon}
          position={[-0.14, 0.62, 0]}
          rotation={[0, 0, 0.45]}
        />
        <mesh
          geometry={GIFT_GEOM.bowLoop}
          material={GIFT_MAT.goldRibbon}
          position={[0.14, 0.62, 0]}
          rotation={[0, 0, -0.45]}
        />
      </group>
    </group>
  );
}

const SPARKLE_DIRS: ReadonlyArray<[number, number, number]> = [
  [1, 0.9, 0],
  [-1, 0.9, 0],
  [0, 0.9, 1],
  [0, 0.9, -1],
  [0.7, 1.3, 0.7],
  [-0.7, 1.3, 0.7],
  [0.7, 1.3, -0.7],
  [-0.7, 1.3, -0.7],
];

function GiftSparkleBurst({
  position,
  respawnAtMs,
}: {
  position: [number, number];
  respawnAtMs: number;
}) {
  const burstRef = useRef<THREE.Group>(null);
  const collectedAtMs = respawnAtMs - 20_000;

  useFrame(() => {
    const grp = burstRef.current;
    if (!grp) return;
    const elapsedSec = (Date.now() - collectedAtMs) / 1000;
    if (elapsedSec < 0 || elapsedSec > 0.9) {
      grp.visible = false;
      return;
    }
    grp.visible = true;
    const p = elapsedSec / 0.9;
    const scale = Math.max(0.01, 1 - p);
    grp.children.forEach((child, idx) => {
      const dir = SPARKLE_DIRS[idx];
      if (!dir) return;
      const dist = p * 2.4;
      child.position.set(
        dir[0] * dist,
        0.7 + dir[1] * dist - p * p * 1.1,
        dir[2] * dist
      );
      child.scale.setScalar(scale);
      child.rotation.y = elapsedSec * 6;
    });
  });

  return (
    <group ref={burstRef} position={[position[0], 0, position[1]]}>
      {SPARKLE_DIRS.map((_, idx) => (
        <mesh
          key={`spark-${idx}`}
          geometry={GIFT_GEOM.sparkle}
          material={GIFT_MAT.goldRibbon}
        />
      ))}
    </group>
  );
}

/**
 * Renders mystery gift boxes on the road and respawns collected boxes after 20s (Rule 6.4).
 */
export function GiftBoxes() {
  const { giftBoxes, graph } = useClassStore(
    useShallow((s) => ({
      giftBoxes: s.giftBoxes,
      graph: s.layout.graph,
    }))
  );

  // Periodically check if any collected gift box has reached its respawnAtMs timer
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const state = useClassStore.getState();
      const needsRespawn = state.giftBoxes.some(
        (b) => !b.active && b.respawnAtMs !== undefined && now >= b.respawnAtMs
      );
      if (!needsRespawn) return;

      const occupied = new Set(
        state.giftBoxes.filter((b) => b.active).map((b) => b.waypointId)
      );
      const candidates = graph.ringOrder.filter(
        (id) => !occupied.has(id) && Boolean(graph.nodes[id])
      );

      useClassStore.setState((prev) => ({
        giftBoxes: prev.giftBoxes.map((b) => {
          if (b.active || !b.respawnAtMs || now < b.respawnAtMs) {
            return b;
          }
          const nextWp =
            candidates[Math.floor(Math.random() * candidates.length)] ??
            b.waypointId;
          const coords = graph.nodes[nextWp] ?? b.position;
          return {
            ...b,
            waypointId: nextWp,
            position: [coords[0], coords[1]],
            active: true,
            respawnAtMs: undefined,
          };
        }),
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [graph]);

  return (
    <group name="GiftBoxes">
      {giftBoxes.map((box, idx) =>
        box.active ? (
          <SingleGiftBox
            key={box.id}
            position={box.position}
            index={idx}
          />
        ) : box.respawnAtMs !== undefined ? (
          <GiftSparkleBurst
            key={`${box.id}-burst`}
            position={box.position}
            respawnAtMs={box.respawnAtMs}
          />
        ) : null
      )}
    </group>
  );
}
