'use client';

import React from 'react';
import { ModelLoader } from './ModelLoader';
import { AvatarProps } from '@/types/3d';

export const DEFAULT_AVATAR_URL = '/models/avatar/base-avatar.glb';

/**
 * Reusable Base Avatar Component
 * Serves as the primary 3D mannequin / base character foundation for fashion visualization.
 *
 * ARCHITECTURE & FLOW:
 * Scene -> Avatar -> ModelLoader -> useGLTF -> GLB
 *
 * Encapsulates avatar asset location and attachment slot group references while delegating
 * all GLB loading, scene cloning, and resource lifecycle management to ModelLoader.
 */
export function Avatar({
  modelUrl = DEFAULT_AVATAR_URL,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.18, // Scales base ~1.45m model to standard fashion height (~1.71m)
  garmentSlots = [],
  castShadow = true,
  receiveShadow = true,
  deepCloneMaterials = false,
  onLoad,
}: AvatarProps) {
  return (
    <group name="avatar-root">
      <ModelLoader
        url={modelUrl}
        position={position}
        rotation={rotation}
        scale={scale}
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

// Preload static asset helper
Avatar.preload = (url: string = DEFAULT_AVATAR_URL) => {
  ModelLoader.preload(url);
};
