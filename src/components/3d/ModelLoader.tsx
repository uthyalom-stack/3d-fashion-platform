'use client';

import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { Object3D } from 'three';
import { dispose3DObject } from '@/lib/3d/disposal';

export interface ModelLoaderProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  clone?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Reusable GLB/glTF Model Loader Component
 * Leverages R3F useGLTF loader with object isolation and automatic Three.js resource disposal.
 */
export function ModelLoader({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  clone = true,
  castShadow = true,
  receiveShadow = true,
  onLoad,
}: ModelLoaderProps) {
  const gltf = useGLTF(url);

  // Clone scene if requested to isolate transforms/materials across instances
  const modelScene = useMemo(() => {
    if (!gltf || !gltf.scene) return null;
    const cloned = clone ? gltf.scene.clone(true) : gltf.scene;

    cloned.traverse((child: Object3D) => {
      if ('isMesh' in child && child.isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });

    return cloned;
  }, [gltf, clone, castShadow, receiveShadow]);

  useEffect(() => {
    if (modelScene && onLoad) {
      onLoad();
    }
  }, [modelScene, onLoad]);

  // Clean up resources on unmount or URL change if cloned
  useEffect(() => {
    return () => {
      if (clone && modelScene) {
        dispose3DObject(modelScene, {
          disposeGeometries: true,
          disposeMaterials: true,
          disposeTextures: false, // Keep cached textures intact in Drei GLTF loader cache
        });
      }
    };
  }, [clone, modelScene]);

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
