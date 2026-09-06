'use client';

import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Mesh, Material } from 'three';
import { dispose3DObject } from '@/lib/3d/disposal';

export interface ModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  /**
   * If true, creates instance-owned copies of materials so material edits (e.g. color, roughness)
   * on this instance do not affect other instances or the useGLTF cache.
   * Instance-owned materials are cleanly disposed upon unmount without corrupting cached base materials.
   */
  deepCloneMaterials?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
}

/**
 * Reusable GLB/glTF Model Loader Component
 * Leverages R3F useGLTF loader with explicit Strict Mode-safe resource ownership.
 *
 * RESOURCE OWNERSHIP & LIFECYCLE:
 * - Scene Hierarchy: ALWAYS cloned (`gltf.scene.clone(true)`) so every ModelLoader instance
 *   has an isolated Object3D transform tree and cannot mutate the cached scene graph.
 * - Geometries & Base Materials: Owned by the Drei `useGLTF` cache and are NEVER disposed when an instance unmounts.
 * - Instance Materials (`deepCloneMaterials = true`): Managed within a Strict Mode-safe `useEffect` lifecycle.
 *   Cloned materials are created on setup and disposed on cleanup, while original cached material references
 *   are stored in `mesh.userData` and restored prior to disposal so Strict Mode remounts remain valid.
 * - Textures: Owned by `useGLTF` cache and never disposed by individual component instances.
 * - Error Handling: Delegated cleanly to React Suspense and surrounding ThreeErrorBoundary.
 */
export function ModelLoader({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  deepCloneMaterials = false,
  castShadow = true,
  receiveShadow = true,
  onLoad,
}: ModelLoaderProps) {
  const gltf = useGLTF(url);

  // Always clone scene graph hierarchy for transform isolation
  const modelScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;

    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((child: Object3D) => {
      if ('isMesh' in child && child.isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
      }
    });

    return clonedScene;
  }, [gltf, castShadow, receiveShadow]);

  // Handle onLoad callback
  useEffect(() => {
    if (modelScene && onLoad) {
      onLoad();
    }
  }, [modelScene, onLoad]);

  // Manage instance-owned material lifecycle safely (Strict Mode compatible)
  useEffect(() => {
    if (!modelScene || !deepCloneMaterials) return;

    const createdInstanceMaterials: Material[] = [];

    // Setup: Clone materials for instance isolation and store originals
    modelScene.traverse((child: Object3D) => {
      if ('isMesh' in child && child.isMesh) {
        const mesh = child as Mesh;
        if (mesh.material) {
          if (!mesh.userData._originalMaterial) {
            mesh.userData._originalMaterial = mesh.material;
          }

          if (Array.isArray(mesh.material)) {
            const clonedArr = mesh.material.map((m) => {
              const c = m.clone();
              createdInstanceMaterials.push(c);
              return c;
            });
            mesh.material = clonedArr;
          } else {
            const clonedMat = mesh.material.clone();
            createdInstanceMaterials.push(clonedMat);
            mesh.material = clonedMat;
          }
        }
      }
    });

    // Cleanup: Restore original cached materials and dispose instance-owned clones
    return () => {
      modelScene.traverse((child: Object3D) => {
        if ('isMesh' in child && child.isMesh) {
          const mesh = child as Mesh;
          if (mesh.userData._originalMaterial) {
            mesh.material = mesh.userData._originalMaterial;
          }
        }
      });

      // Dispose instance-owned cloned materials safely
      createdInstanceMaterials.forEach((mat) => {
        dispose3DObject(undefined, { disposeGeometries: false, disposeMaterials: false });
        mat.dispose();
      });
    };
  }, [modelScene, deepCloneMaterials]);

  if (!modelScene) return null;

  const scaleValue: [number, number, number] = Array.isArray(scale)
    ? scale
    : [scale, scale, scale];

  return (
    <primitive
      object={modelScene}
      position={position}
      rotation={rotation}
      scale={scaleValue}
    />
  );
}

// Preload helper
ModelLoader.preload = (url: string) => {
  useGLTF.preload(url);
};
