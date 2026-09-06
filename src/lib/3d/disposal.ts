import { Object3D, Mesh, Material, Texture, BufferGeometry } from 'three';

export interface DisposalOptions {
  disposeGeometries?: boolean;
  disposeMaterials?: boolean;
  disposeTextures?: boolean;
}

/**
 * Safely disposes a material and its associated textures.
 */
function disposeMaterial(material: Material, options: DisposalOptions) {
  if (!options.disposeMaterials && !options.disposeTextures) return;

  if (options.disposeTextures) {
    // Iterate over material properties to dispose textures safely
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
 * Recursively traverses a Three.js Object3D hierarchy and disposes of resources
 * (geometries, materials, textures) to prevent WebGL memory leaks.
 *
 * Safe for cloned scenes when options are set appropriately.
 */
export function dispose3DObject(
  object: Object3D | null | undefined,
  options: DisposalOptions = {
    disposeGeometries: true,
    disposeMaterials: true,
    disposeTextures: true,
  }
): void {
  if (!object) return;

  object.traverse((child: Object3D) => {
    if ((child as Mesh).isMesh) {
      const mesh = child as Mesh;

      // Dispose geometry
      if (options.disposeGeometries && mesh.geometry) {
        (mesh.geometry as BufferGeometry).dispose();
      }

      // Dispose materials & textures
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
