import * as THREE from 'three';

const sharedShadowGeometry = new THREE.CircleGeometry(1, 20);
const sharedShadowMaterial = new THREE.MeshBasicMaterial({
  color: '#000000',
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
});

export interface BlobShadowProps {
  radius?: number;
  opacity?: number;
  y?: number;
}

/**
 * Lightweight flat circular shadow under avatars and vehicles (Rule 6.3 & 8.1).
 * Avoids expensive dynamic shadow maps on moving entities.
 */
export function BlobShadow({
  radius = 0.85,
  y = 0.02,
}: BlobShadowProps) {
  return (
    <mesh
      geometry={sharedShadowGeometry}
      material={sharedShadowMaterial}
      position={[0, y, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[radius, radius, 1]}
      renderOrder={1}
    />
  );
}
