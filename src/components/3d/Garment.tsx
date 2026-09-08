'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';
import { GARMENT_REGISTRY } from '../../lib/3d/garmentRegistry';
import {
  resolveGarmentTransform,
  resolveAttachmentAnchor,
  attachGarmentToAnchor,
  detachGarmentFromAnchor,
} from '../../lib/3d/attachmentResolver';
import { AvatarId } from '../../types/3d';

export interface GarmentProps {
  garmentId: string;
  avatarId?: AvatarId;
  avatarScene?: THREE.Object3D | null;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  onLoad?: () => void;
}

/**
 * Reusable Garment Component
 * Loads and attaches a 3D garment asset into the avatar's real skeletal bone hierarchy.
 * Reuses the Phase 1 ModelLoader and attachment resolver for transform and parenting ownership.
 *
 * ARCHITECTURE:
 * Scene -> Garment -> attachGarmentToAnchor -> THREE.Bone -> ModelLoader -> useGLTF
 */
export function Garment({
  garmentId,
  avatarId = 'male',
  avatarScene,
  position,
  rotation,
  scale,
  castShadow = true,
  receiveShadow = true,
  onLoad,
}: GarmentProps) {
  const garmentGroupRef = useRef<THREE.Group>(null);
  const config = GARMENT_REGISTRY[garmentId];

  // Resolve config and compatibility checks
  const isCompatible = Boolean(
    config && (!config.supportedAvatarIds || config.supportedAvatarIds.includes(avatarId))
  );

  // Centralized transform resolution
  const resolved = useMemo(
    () => (config ? resolveGarmentTransform(config, avatarId) : null),
    [config, avatarId]
  );

  const targetGarmentScale = scale ?? resolved?.garmentScale ?? 1.0;
  const targetAvatarNormScale = resolved?.avatarNormScale ?? 0.1;

  const targetPosition = useMemo<[number, number, number]>(
    () => position ?? resolved?.position ?? [0, 0, 0],
    [position, resolved?.position]
  );
  const targetRotation = useMemo<[number, number, number]>(
    () => rotation ?? resolved?.rotation ?? [0, 0, 0],
    [rotation, resolved?.rotation]
  );

  // Real skeletal hierarchy parenting effect (called unconditionally)
  useEffect(() => {
    const garmentGroup = garmentGroupRef.current;
    if (!garmentGroup || !avatarScene || !config || !isCompatible) return;

    try {
      const anchorNode = resolveAttachmentAnchor(avatarScene, config.slot, avatarId);

      attachGarmentToAnchor(garmentGroup, anchorNode, {
        position: targetPosition,
        rotation: targetRotation,
        garmentScale: targetGarmentScale,
        avatarNormScale: targetAvatarNormScale,
        anchorJoint: anchorNode.name,
      });

      return () => {
        detachGarmentFromAnchor(garmentGroup);
      };
    } catch (err) {
      console.error(`[Garment Attachment Error]`, err);
    }
  }, [
    avatarScene,
    config,
    avatarId,
    isCompatible,
    targetPosition,
    targetRotation,
    targetGarmentScale,
    targetAvatarNormScale,
  ]);

  if (!config) {
    console.warn(`[Garment] Garment ID "${garmentId}" not found in GARMENT_REGISTRY.`);
    return null;
  }

  // Enforce Avatar Compatibility
  if (!isCompatible) {
    console.warn(
      `[Garment] Incompatible avatar: Garment "${garmentId}" supports [${config.supportedAvatarIds.join(
        ', '
      )}], but current avatar is "${avatarId}". Skipping render.`
    );
    return null;
  }

  return (
    <group
      ref={garmentGroupRef}
      name={`garment-root-${config.id}`}
      key={`${config.id}-${avatarId}`}
    >
      <ModelLoader
        url={config.modelUrl}
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
