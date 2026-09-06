'use client';

import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D, Mesh } from 'three';
import { dispose3DObject } from '@/lib/3d/disposal';

export interface ModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  /**
   * If true, creates instance-owned copies of materials so material edits (e.g. color, roughness)
   * on this instance do not affect other instances or the useGLTF cache.
   * When unmounted, instance-owned materials are safely disposed.
   */
  deepCloneMaterials?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
}

/**
 * Reusable GLB/glTF Model Loader Component
 * Leverages R3F useGLTF loader with a single, unambiguous resource ownership model.
 *
 * RESOURCE OWNERSHIP & LIFECYCLE:
 * - Scene Hierarchy: ALWAYS cloned (`gltf.scene.clone(true)`) so every ModelLoader instance
 *   has an isolated Object3D transform tree and cannot mutate the cached scene graph.
 * - Geometries & Base Materials: Owned by the Drei `useGLTF` cache and are NEVER disposed when an instance unmounts.
 * - Instance Materials (`deepCloneMaterials = true`): Owned by this ModelLoader instance and automatically
 *   disposed via `dispose3DObject(modelScene, { disposeGeometries: false, disposeMaterials: true, disposeTextures: false })`
 *   upon component unmount or URL change.
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

  // Always clone the scene hierarchy to isolate Object3D transforms
  const modelScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;

    const clonedScene = gltf.scene.clone(true);

    clonedScene.traverse((child: Object3D) => {
      if ('isMesh' in child && child.isMesh) {
        const mesh = child as Mesh;
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;

        if (deepCloneMaterials && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((mat) => mat.clone());
          } else {
            mesh.material = mesh.material.clone();
          }
        }
      }
    });

    return clonedScene;
  }, [gltf, deepCloneMaterials, castShadow, receiveShadow]);

  useEffect(() => {
    if (modelScene && onLoad) {
      onLoad();
    }
  }, [modelScene, onLoad]);

  // Clean up instance-owned resources on unmount or modelScene update
  useEffect(() => {
    return () => {
      if (modelScene) {
        // Only dispose materials if deepCloneMaterials was set (meaning the instance owns them)
        dispose3DObject(modelScene, {
          disposeGeometries: false,
          disposeMaterials: deepCloneMaterials,
          disposeTextures: false,
        });
      }
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
