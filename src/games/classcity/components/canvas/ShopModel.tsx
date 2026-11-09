import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { AssetService } from '../../../../platform/assets/assetService';
import { disposeObject3D } from '../../../../three-kit/Disposer';
import type { ShopBranch } from '../../state/types';
import { ShopProcedural } from './ShopProcedural';
import { ShopToppers } from './ShopToppers';

export interface ShopModelProps {
  level: number;
  branch: ShopBranch;
  color: string;
  assets?: AssetService;
  castShadow?: boolean;
}

/**
 * Renders either the loaded `.glb` shop model (`shop_level_N`) or `<ShopProcedural />` fallback (Rule 6.2 & 7).
 * Animates a joyful GSAP bounce whenever `level` changes, killing any active tween on unmount (Rule R5).
 */
export function ShopModel({
  level,
  branch,
  color,
  assets,
  castShadow = true,
}: ShopModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const tweenRef = useRef<gsap.core.Timeline | null>(null);
  const prevLevelRef = useRef<number>(level);
  const [gltfScene, setGltfScene] = useState<THREE.Object3D | null>(null);

  const assetId = `shop_level_${Math.min(20, Math.max(1, level))}`;

  useEffect(() => {
    let cancelled = false;
    if (!assets) {
      setGltfScene(null);
      return;
    }

    void assets.get(assetId, { priority: 'high' }).then((loaded) => {
      if (cancelled) return;
      if (loaded && loaded.scene) {
        setGltfScene(loaded.scene);
      } else {
        setGltfScene(null);
      }
    });

    return () => {
      cancelled = true;
      assets.release(assetId);
    };
  }, [assets, assetId]);

  const clonedGltf = useMemo(() => {
    if (!gltfScene) return null;
    const clone = SkeletonUtils.clone(gltfScene);
    const anchor = clone.getObjectByName('Anchor_Topper');
    let topperPos: [number, number, number] = [0, 3.5, 0];
    if (anchor) {
      topperPos = [anchor.position.x, anchor.position.y, anchor.position.z];
    } else {
      const box = new THREE.Box3().setFromObject(clone);
      if (!box.isEmpty()) {
        topperPos = [0, box.max.y, 0];
      }
    }
    return { clone, topperPos };
  }, [gltfScene]);

  useEffect(() => {
    return () => {
      if (clonedGltf) {
        disposeObject3D(clonedGltf.clone);
      }
    };
  }, [clonedGltf]);

  // GSAP bounce animation when level changes (Rule 6.2 & R5)
  useEffect(() => {
    if (prevLevelRef.current === level) return;
    prevLevelRef.current = level;

    const grp = groupRef.current;
    if (!grp) return;

    tweenRef.current?.kill();
    const tl = gsap.timeline();
    tl.fromTo(
      grp.position,
      { y: 1.6 },
      { y: 0, duration: 0.55, ease: 'bounce.out' },
      0
    );
    tl.fromTo(
      grp.scale,
      { x: 0.78, y: 1.28, z: 0.78 },
      { x: 1, y: 1, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' },
      0
    );
    tweenRef.current = tl;

    return () => {
      tl.kill();
    };
  }, [level]);

  useEffect(() => {
    return () => {
      tweenRef.current?.kill();
    };
  }, []);

  return (
    <group ref={groupRef}>
      {clonedGltf ? (
        <group>
          <primitive object={clonedGltf.clone} />
          <ShopToppers branch={branch} position={clonedGltf.topperPos} />
        </group>
      ) : (
        <ShopProcedural
          level={level}
          branch={branch}
          color={color}
          castShadow={castShadow}
        />
      )}
    </group>
  );
}
