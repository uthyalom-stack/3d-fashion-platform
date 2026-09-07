'use client';

import React from 'react';
import { ModelLoader } from './ModelLoader';
import { GARMENT_REGISTRY } from '@/lib/3d/garmentRegistry';
import { resolveGarmentTransform } from '@/lib/3d/attachmentResolver';
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
 * Reuses the Phase 1 ModelLoader and attachment resolver for transform ownership.
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

  // Enforce Avatar Compatibility
  if (config.supportedAvatarIds && !config.supportedAvatarIds.includes(avatarId)) {
    console.warn(
      `[Garment] Incompatible avatar: Garment "${garmentId}" supports [${config.supportedAvatarIds.join(
        ', '
      )}], but current avatar is "${avatarId}". Skipping render.`
    );
    return null;
  }

  // Centralized transform resolution (Transform Ownership)
  const resolved = resolveGarmentTransform(config, avatarId);

  const targetScale = scale ?? resolved.scale;
  const targetPosition = position ?? resolved.position;
  const targetRotation = rotation ?? resolved.rotation;

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
