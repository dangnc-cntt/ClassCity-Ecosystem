import type { Object3D } from 'three';

interface DisposableResource {
  dispose?: () => void;
}

function disposeMaterial(mat: unknown): void {
  if (!mat || typeof mat !== 'object') return;
  const record = mat as Record<string, unknown> & DisposableResource;

  // Dispose any textures attached to material properties (map, normalMap, emissiveMap, etc.)
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const maybeTex = value as { isTexture?: boolean; dispose?: () => void };
      if (maybeTex.isTexture && typeof maybeTex.dispose === 'function') {
        maybeTex.dispose();
      }
    }
  }

  if (typeof record.dispose === 'function') {
    record.dispose();
  }
}

/**
 * Recursively disposes geometries, materials, and textures on an Object3D tree (Rule R5).
 */
export function disposeObject3D(root: Object3D | null | undefined): void {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as Object3D & {
      geometry?: DisposableResource;
      material?: unknown;
    };
    if (mesh.geometry && typeof mesh.geometry.dispose === 'function') {
      mesh.geometry.dispose();
    }
    if (Array.isArray(mesh.material)) {
      for (const mat of mesh.material) {
        disposeMaterial(mat);
      }
    } else if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
}
