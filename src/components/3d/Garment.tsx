'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ModelLoader } from './ModelLoader';
import { GARMENT_REGISTRY } from '../../lib/3d/garmentRegistry';
import { resolveAssetUrl } from '../../lib/3d/assetDelivery';
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
    () => (config ? resolveGarmentTransform(config) : null),
    [config]
  );

  const targetGarmentScale = scale ?? resolved?.garmentScale ?? 1.0;

  const targetLocalPosition = useMemo<[number, number, number]>(
    () => position ?? resolved?.localPosition ?? [0, 0, 0],
    [position, resolved?.localPosition]
  );
  const targetLocalRotation = useMemo<[number, number, number]>(
    () => rotation ?? resolved?.localRotation ?? [0, 0, 0],
    [rotation, resolved?.localRotation]
  );

  // Validate attachment anchor during render so missing primary joint throws a controlled component error
  // that reaches ThreeErrorBoundary as designed
  const resolvedAnchorNode = useMemo(() => {
    if (avatarScene && config && isCompatible) {
      return resolveAttachmentAnchor(avatarScene, config.slot, avatarId);
    }
    return null;
  }, [avatarScene, config, isCompatible, avatarId]);

  // Real skeletal hierarchy parenting effect (called unconditionally)
  useEffect(() => {
    const garmentGroup = garmentGroupRef.current;
    if (!garmentGroup || !resolvedAnchorNode) return;

    attachGarmentToAnchor(garmentGroup, resolvedAnchorNode, {
      localPosition: targetLocalPosition,
      localRotation: targetLocalRotation,
      garmentScale: targetGarmentScale,
      anchorJoint: resolvedAnchorNode.name,
    });

    return () => {
      detachGarmentFromAnchor(garmentGroup);
    };
  }, [
    resolvedAnchorNode,
    targetLocalPosition,
    targetLocalRotation,
    targetGarmentScale,
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

  const modelDeliveryUrl = resolveAssetUrl(config.modelUrl);

  return (
    <group
      ref={garmentGroupRef}
      name={`garment-root-${config.id}`}
      key={`${config.id}-${avatarId}`}
    >
      <ModelLoader
        url={modelDeliveryUrl}
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
    ModelLoader.preload(resolveAssetUrl(config.modelUrl));
  }
};
