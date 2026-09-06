import { Object3D, Mesh, Material, Texture, BufferGeometry } from 'three';

export interface DisposalOptions {
  disposeGeometries?: boolean;
  disposeMaterials?: boolean;
  disposeTextures?: boolean;
}

/**
 * Safely disposes a material and optionally its associated textures.
 */
function disposeMaterial(material: Material, options: DisposalOptions) {
  if (!options.disposeMaterials && !options.disposeTextures) return;

  if (options.disposeTextures) {
    const matAny = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(matAny)) {
      const prop = matAny[key];
      if (prop && typeof prop === 'object' && (prop as Texture).isTexture) {
        (prop as Texture).dispose();
      }
    }
  }

  if (options.disposeMaterials) {
    material.dispose();
  }
}

/**
 * Resource Disposal Utility
 *
 * RESOURCE OWNERSHIP RULES & LIFECYCLE CONTRACT:
 * 1. Shared Resources (`useGLTF` / Drei cached models):
 *    - Drei/`useGLTF` retains ownership of `BufferGeometry`, base `Material`, and `Texture` instances.
 *    - ModelLoader always shallow-clones Object3D hierarchies (`scene.clone(true)`), sharing underlying GPU allocations.
 *    - Callers MUST set `disposeGeometries: false` and `disposeTextures: false` for shallow-cloned models so cached GPU resources are preserved.
 *
 * 2. Instance-Owned Resources (`deepCloneMaterials: true` or custom meshes):
 *    - When an instance explicitly clones materials (`mesh.material = mesh.material.clone()`), those materials are owned by that instance.
 *    - Calling `dispose3DObject(object, { disposeGeometries: false, disposeMaterials: true, disposeTextures: false })` disposes instance-owned materials without corrupting shared geometry or texture caches.
 */
export function dispose3DObject(
  object: Object3D | null | undefined,
  options: DisposalOptions = {
    disposeGeometries: false,
    disposeMaterials: false,
    disposeTextures: false,
  }
): void {
  if (!object) return;

  object.traverse((child: Object3D) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;

      if (options.disposeGeometries && mesh.geometry) {
        (mesh.geometry as BufferGeometry).dispose();
      }

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => disposeMaterial(mat, options));
        } else {
          disposeMaterial(mesh.material, options);
        }
      }
    }
  });
}
