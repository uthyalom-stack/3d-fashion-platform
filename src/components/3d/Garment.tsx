'use client';

import React from 'react';
import { ModelLoader } from './ModelLoader';
import { GARMENT_REGISTRY } from '@/lib/3d/garmentRegistry';
import { AVATAR_REGISTRY } from './Avatar';
import { AvatarId } from '@/types/3d';

export interface GarmentProps {
  garmentId: string;
  avatarId?: AvatarId;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
}

/**
 * Reusable Garment Component
 * Loads and displays a 3D garment asset aligned to the target base avatar.
 * Reuses the Phase 1 ModelLoader, ensuring proper Three.js resource disposal & ownership.
 *
 * ARCHITECTURE:
 * Scene -> Garment -> ModelLoader -> useGLTF
 */
export function Garment({
  garmentId,
  avatarId = 'male',
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  onLoad,
}: GarmentProps) {
  const config = GARMENT_REGISTRY[garmentId];

  if (!config) {
    console.warn(`[Garment] Garment ID "${garmentId}" not found in GARMENT_REGISTRY.`);
    return null;
  }

  // Determine avatar-relative scale normalization
  const avatarConfig = AVATAR_REGISTRY[avatarId] || AVATAR_REGISTRY.male;
  const targetScale = scale ?? config.scale ?? avatarConfig.scale;

  const targetPosition: [number, number, number] = position
    ? position
    : config.positionOffset ?? avatarConfig.positionOffset;

  const targetRotation: [number, number, number] = rotation
    ? rotation
    : config.rotationOffset ?? avatarConfig.rotationOffset;

  return (
    <group name={`garment-root-${config.id}`} key={`${config.id}-${avatarId}`}>
      <ModelLoader
        url={config.modelUrl}
        position={targetPosition}
        rotation={targetRotation}
        scale={targetScale}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        onLoad={onLoad}
      />
    </group>
  );
}

Garment.preload = (garmentId: string) => {
  const config = GARMENT_REGISTRY[garmentId];
  if (config) {
    ModelLoader.preload(config.modelUrl);
  }
};
