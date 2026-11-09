import type { Object3D } from 'three';

export function disposeObject3D(root: Object3D | null | undefined): void {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as Object3D & {
      geometry?: { dispose?: () => void };
      material?: { dispose?: () => void } | Array<{ dispose?: () => void }>;
    };
    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }
    if (Array.isArray(mesh.material)) {
      for (const mat of mesh.material) {
        if (mat && typeof mat.dispose === 'function') {
          mat.dispose();
        }
      }
    } else if (mesh.material && typeof mesh.material.dispose === 'function') {
      mesh.material.dispose();
    }
  });
}
