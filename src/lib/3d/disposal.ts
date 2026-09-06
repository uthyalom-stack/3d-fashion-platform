import { Object3D, Mesh, Material, Texture, BufferGeometry } from 'three';

export interface DisposalOptions {
  disposeGeometries?: boolean;
  disposeMaterials?: boolean;
  disposeTextures?: boolean;
}

export interface MaterialDisposalOptions {
  disposeTextures?: boolean;
}

/**
 * Safely disposes a material (or array of materials) and optionally its associated textures.
 */
export function disposeMaterial(
  material: Material | Material[] | null | undefined,
  options: MaterialDisposalOptions = { disposeTextures: false }
): void {
  if (!material) return;

  if (Array.isArray(material)) {
    material.forEach((mat) => disposeMaterial(mat, options));
    return;
  }

  if (options.disposeTextures) {
    const matAny = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(matAny)) {
      const prop = matAny[key];
      if (prop && typeof prop === 'object' && (prop as Texture).isTexture) {
        (prop as Texture).dispose();
      }
    }
  }

  material.dispose();
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
 *    - Calling `disposeMaterial(clonedMaterials)` or `dispose3DObject(object, { disposeGeometries: false, disposeMaterials: true, disposeTextures: false })`
 *      disposes instance-owned materials without corrupting shared geometry or texture caches.
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

      if (options.disposeMaterials && mesh.material) {
        disposeMaterial(mesh.material, { disposeTextures: options.disposeTextures });
      }
    }
  });
}
