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
 * RESOURCE OWNERSHIP RULES:
 * 1. Shared Resources (default for useGLTF / Drei cached models):
 *    - Drei/useGLTF retains ownership of BufferGeometry, Material, and Texture instances.
 *    - Object3D hierarchies cloned via `scene.clone(true)` share these underlying GPU resources.
 *    - DO NOT call dispose3DObject with disposeGeometries=true or disposeMaterials=true on shallow-cloned
 *      scenes, as doing so invalidates GPU resources in the useGLTF cache and breaks re-mounting/reuse.
 *
 * 2. Instance-Owned Resources (deeply cloned or manually instantiated objects):
 *    - If an instance explicitly deep-clones its geometries/materials (e.g., `mesh.material = mesh.material.clone()`),
 *      those cloned resources are owned by that instance and MUST be disposed when the instance unmounts.
 *    - Use `dispose3DObject(object, { disposeGeometries: true, disposeMaterials: true })` ONLY for instance-owned objects.
 */
export function dispose3DObject(
  object: Object3D | null | undefined,
  options: DisposalOptions = {
    disposeGeometries: true,
    disposeMaterials: true,
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
