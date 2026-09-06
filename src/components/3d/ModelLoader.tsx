'use client';

import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Mesh, Material } from 'three';

export interface ModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  /**
   * If true (default), clones the Object3D scene hierarchy so this instance has an isolated transform tree.
   * By default, underlying BufferGeometry and Material resources remain shared with the useGLTF cache.
   */
  clone?: boolean;
  /**
   * If true, creates instance-owned copies of materials so material edits (e.g. color, roughness) on this instance
   * do not affect other instances or the useGLTF cache. When unmounted, instance-owned materials are disposed.
   */
  deepCloneMaterials?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
}

/**
 * Reusable GLB/glTF Model Loader Component
 * Leverages R3F useGLTF loader with clear resource ownership rules.
 *
 * RESOURCE OWNERSHIP:
 * - Geometries and base materials are owned by the Drei useGLTF cache and are NOT disposed when this component unmounts.
 * - If `deepCloneMaterials` is true, material clones created for this instance are owned by this component and disposed on unmount.
 * - Error handling is cleanly delegated to React Suspense and surrounding ThreeErrorBoundary.
 */
export function ModelLoader({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  clone = true,
  deepCloneMaterials = false,
  castShadow = true,
  receiveShadow = true,
  onLoad,
}: ModelLoaderProps) {
  const gltf = useGLTF(url);

  // Clone scene hierarchy and optionally deep-clone materials for instance isolation
  const { modelScene, ownedMaterials } = useMemo(() => {
    if (!gltf || !gltf.scene) return { modelScene: null, ownedMaterials: [] };

    const clonedScene = clone ? gltf.scene.clone(true) : gltf.scene;
    const clonedMats: Material[] = [];

    clonedScene.traverse((child: Object3D) => {
      if ('isMesh' in child && child.isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;

        if (deepCloneMaterials && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => {
              const mClone = mat.clone();
              clonedMats.push(mClone);
              return mClone;
            });
          } else {
            const mClone = mesh.material.clone();
            clonedMats.push(mClone);
            mesh.material = mClone;
          }
        }
      }
    });

    return { modelScene: clonedScene, ownedMaterials: clonedMats };
  }, [gltf, clone, deepCloneMaterials, castShadow, receiveShadow]);

  useEffect(() => {
    if (modelScene && onLoad) {
      onLoad();
    }
  }, [modelScene, onLoad]);

  // Clean up ONLY instance-owned resources on unmount
  useEffect(() => {
    return () => {
      // If we deep-cloned materials for this instance, dispose only those owned materials
      if (ownedMaterials.length > 0) {
        ownedMaterials.forEach((mat) => mat.dispose());
      }

      // Do NOT call dispose3DObject with disposeGeometries/disposeMaterials on shared useGLTF cache resources.
    };
  }, [ownedMaterials]);

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
