'use client';

import React from 'react';
import { Object3D } from 'three';
import { ModelLoader } from './ModelLoader';
import { AvatarProps, AvatarId, AvatarConfig } from '../../types/3d';
import { getAvatarAsset } from '../../lib/3d/assetRegistry';
import { resolveAssetUrl } from '../../lib/3d/assetDelivery';

/**
 * DERIVED COMPATIBILITY ADAPTER
 * Builds avatar configurations derived directly from the authoritative central Asset Registry (`src/lib/3d/assetRegistry.ts`).
 */
function buildAvatarRegistry(): Record<AvatarId, AvatarConfig> {
  const maleAsset = getAvatarAsset('male');
  const femaleAsset = getAvatarAsset('female');

  return {
    male: {
      id: 'male',
      name: maleAsset?.displayName || 'Adult Male Avatar',
      modelUrl: maleAsset ? resolveAssetUrl(maleAsset) : '/models/avatar/male/base-avatar.glb',
      scale: maleAsset?.scale ?? 0.11,
      positionOffset: maleAsset?.positionOffset || [0, 0, 0],
      rotationOffset: maleAsset?.rotationOffset || [0, 0, 0],
      gender: maleAsset?.gender || 'male',
    },
    female: {
      id: 'female',
      name: femaleAsset?.displayName || 'Adult Female Avatar',
      modelUrl: femaleAsset ? resolveAssetUrl(femaleAsset) : '/models/avatar/female/base-avatar.glb',
      scale: femaleAsset?.scale ?? 0.10,
      positionOffset: femaleAsset?.positionOffset || [0, 0, 0],
      rotationOffset: femaleAsset?.rotationOffset || [0, 0, 0],
      gender: femaleAsset?.gender || 'female',
    },
  };
}

/**
 * Avatar Registry Configuration
 * Maps adult avatar identifiers to runtime GLB assets derived from central Asset Registry.
 */
export const AVATAR_REGISTRY: Record<AvatarId, AvatarConfig> = buildAvatarRegistry();

export const DEFAULT_AVATAR_ID: AvatarId = 'male';

export interface ExtendedAvatarProps extends AvatarProps {
  onAvatarLoaded?: (scene: Object3D) => void;
}

/**
 * Reusable Base Avatar Component
 * Serves as the primary 3D adult human foundation for fashion visualization.
 * Encapsulates MakeHuman / MPFB2 assets and passes loaded skeletal scene tree for garment attachment.
 *
 * ARCHITECTURE & FLOW:
 * Scene -> Avatar (resolves avatarId) -> AssetDeliveryResolver -> ModelLoader -> useGLTF -> GLB
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
  onAvatarLoaded,
}: ExtendedAvatarProps) {
  // Resolve configuration from registry
  const config = AVATAR_REGISTRY[avatarId] || AVATAR_REGISTRY[DEFAULT_AVATAR_ID];

  const rawUrl = modelUrl || config.modelUrl;
  const resolvedUrl = resolveAssetUrl(rawUrl);
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

  const handleModelLoaded = (scene?: Object3D) => {
    if (scene) {
      if (onAvatarLoaded) {
        onAvatarLoaded(scene);
      }
    }
    if (onLoad) {
      onLoad();
    }
  };

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
        onLoad={handleModelLoaded}
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
            {/* Garment layers attach into real skeletal joints */}
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
    ModelLoader.preload(resolveAssetUrl(config.modelUrl));
  }
};

// Preload all registered avatars helper
Avatar.preloadAll = () => {
  Object.values(AVATAR_REGISTRY).forEach((config) => {
    ModelLoader.preload(resolveAssetUrl(config.modelUrl));
  });
};
