import * as THREE from 'three';

export interface ColoredPartSpec {
  geometry: THREE.BufferGeometry;
  /** Solid colour for the part; when omitted the geometry's own color attribute is preserved. */
  color?: string | THREE.Color;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scl = new THREE.Vector3();
const _col = new THREE.Color();

/**
 * Bakes multiple low-poly primitives with per-part solid colors and local transforms
 * into a single non-indexed vertex-colored `THREE.BufferGeometry` (Rule 8.3 & 8.9).
 * Reduces 8-15 draw calls per procedural shop/avatar/topper down to 1 draw call.
 */
export function mergeColoredGeometries(
  parts: readonly ColoredPartSpec[]
): THREE.BufferGeometry {
  const prepared: Array<{
    geom: THREE.BufferGeometry;
    vertexCount: number;
    colors: Float32Array | null;
    uvs: Float32Array | null;
    r: number;
    g: number;
    b: number;
  }> = [];

  let totalVertices = 0;

  for (const part of parts) {
    const g = part.geometry.index
      ? part.geometry.toNonIndexed()
      : part.geometry.clone();

    _pos.set(
      part.position?.[0] ?? 0,
      part.position?.[1] ?? 0,
      part.position?.[2] ?? 0
    );
    _euler.set(
      part.rotation?.[0] ?? 0,
      part.rotation?.[1] ?? 0,
      part.rotation?.[2] ?? 0
    );
    _quat.setFromEuler(_euler);
    _scl.set(part.scale?.[0] ?? 1, part.scale?.[1] ?? 1, part.scale?.[2] ?? 1);
    _mat4.compose(_pos, _quat, _scl);
    g.applyMatrix4(_mat4);

    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }

    const posAttr = g.getAttribute('position');
    const vertexCount = posAttr.count;
    _col.set(part.color ?? '#FFFFFF');
    const colorAttr = part.color === undefined ? g.getAttribute('color') : undefined;
    const uvAttr = g.getAttribute('uv');

    prepared.push({
      geom: g,
      vertexCount,
      colors: colorAttr ? Float32Array.from({ length: vertexCount * 3 }, (_, k) => (colorAttr.array as ArrayLike<number>)[k] ?? 1) : null,
      uvs: uvAttr ? Float32Array.from({ length: vertexCount * 2 }, (_, k) => (uvAttr.array as ArrayLike<number>)[k] ?? 0) : null,
      r: _col.r,
      g: _col.g,
      b: _col.b,
    });
    totalVertices += vertexCount;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);

  let offset = 0;
  for (const item of prepared) {
    const posAttr = item.geom.getAttribute('position');
    const normAttr = item.geom.getAttribute('normal');

    for (let i = 0; i < item.vertexCount; i += 1) {
      const idx = (offset + i) * 3;
      positions[idx] = posAttr.getX(i);
      positions[idx + 1] = posAttr.getY(i);
      positions[idx + 2] = posAttr.getZ(i);

      normals[idx] = normAttr.getX(i);
      normals[idx + 1] = normAttr.getY(i);
      normals[idx + 2] = normAttr.getZ(i);

      colors[idx] = item.colors ? item.colors[i * 3]! : item.r;
      colors[idx + 1] = item.colors ? item.colors[i * 3 + 1]! : item.g;
      colors[idx + 2] = item.colors ? item.colors[i * 3 + 2]! : item.b;
      if (item.uvs) {
        uvs[(offset + i) * 2] = item.uvs[i * 2]!;
        uvs[(offset + i) * 2 + 1] = item.uvs[i * 2 + 1]!;
      }
    }

    offset += item.vertexCount;
    item.geom.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.computeBoundingSphere();
  return merged;
}
