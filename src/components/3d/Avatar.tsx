'use client';

import React from 'react';
import { ModelLoader } from './ModelLoader';
import { AvatarProps, AvatarId, AvatarConfig } from '@/types/3d';

/**
 * Avatar Registry Configuration
 * Maps avatar identifiers to runtime GLB asset paths and scale normalizations.
 */
export const AVATAR_REGISTRY: Record<AvatarId, AvatarConfig> = {
  male: {
    id: 'male',
    name: 'Male Base Avatar',
    modelUrl: '/models/avatar/male/base-avatar.glb',
    scale: 1.18, // Scales native 1.45m model to standard ~1.71m fashion avatar height
    positionOffset: [0, 0, 0],
    rotationOffset: [0, 0, 0],
    gender: 'male',
  },
  female: {
    id: 'female',
    name: 'Female Base Avatar',
    modelUrl: '/models/avatar/female/base-avatar.glb',
    scale: 1.0, // Native 1.72m height
    positionOffset: [0, 0, 0],
    rotationOffset: [0, 0, 0],
    gender: 'female',
  },
};

export const DEFAULT_AVATAR_ID: AvatarId = 'male';

/**
 * Reusable Base Avatar Component
 * Serves as the primary 3D mannequin / base character foundation for fashion visualization.
 * Supports clean selection between registered base avatars (e.g. 'male' | 'female').
 *
 * ARCHITECTURE & FLOW:
 * Scene -> Avatar (resolves avatarId) -> ModelLoader -> useGLTF -> GLB
 */
export function Avatar({
  avatarId = DEFAULT_AVATAR_ID,
  modelUrl,
  position,
  rotation,
  scale,
  garmentSlots = [],
  castShadow = true,
  receiveShadow = true,
  deepCloneMaterials = false,
  onLoad,
}: AvatarProps) {
  // Resolve configuration from registry (fallback to DEFAULT_AVATAR_ID if unrecognized)
  const config = AVATAR_REGISTRY[avatarId] || AVATAR_REGISTRY[DEFAULT_AVATAR_ID];

  const resolvedUrl = modelUrl || config.modelUrl;
  const resolvedScale = scale !== undefined ? scale : config.scale;

  const resolvedPosition: [number, number, number] = position
    ? [
        position[0] + config.positionOffset[0],
        position[1] + config.positionOffset[1],
        position[2] + config.positionOffset[2],
      ]
    : config.positionOffset;

  const resolvedRotation: [number, number, number] = rotation
    ? [
        rotation[0] + config.rotationOffset[0],
        rotation[1] + config.rotationOffset[1],
        rotation[2] + config.rotationOffset[2],
      ]
    : config.rotationOffset;

  return (
    <group name={`avatar-root-${config.id}`} key={config.id}>
      <ModelLoader
        url={resolvedUrl}
        position={resolvedPosition}
        rotation={resolvedRotation}
        scale={resolvedScale}
        castShadow={castShadow}
        receiveShadow={receiveShadow}
        deepCloneMaterials={deepCloneMaterials}
        onLoad={onLoad}
      />

      {/* Group containers for future garment slot attachments */}
      {garmentSlots.map((slot) => {
        if (!slot.visible) return null;
        return (
          <group
            key={slot.id}
            name={`garment-slot-${slot.id}`}
            data-category={slot.category}
          >
            {/* Garment layers will attach here in future garment phases */}
          </group>
        );
      })}
    </group>
  );
}

// Preload helper for specific avatar
Avatar.preload = (avatarId: AvatarId = DEFAULT_AVATAR_ID) => {
  const config = AVATAR_REGISTRY[avatarId];
  if (config) {
    ModelLoader.preload(config.modelUrl);
  }
};

// Preload all registered avatars helper
Avatar.preloadAll = () => {
  Object.values(AVATAR_REGISTRY).forEach((config) => {
    ModelLoader.preload(config.modelUrl);
  });
};
