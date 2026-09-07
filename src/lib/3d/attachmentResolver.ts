import { GarmentSlot, GarmentAssetConfig } from '../../types/garment';
import { AvatarId } from '../../types/3d';
import { AVATAR_REGISTRY } from '../../components/3d/Avatar';

/**
 * Garment Attachment Anchor Definition
 * Maps canonical garment slots to real skeletal joints on the canonical MakeHuman / MPFB2 base avatars.
 */
export interface AttachmentAnchor {
  slot: GarmentSlot;
  primaryJoint: string;
  secondaryJoints: string[];
  description: string;
}

/**
 * Centralized mapping from canonical slots to real avatar skeletal joints.
 * Derived directly from the 53-joint Game Engine Rig ('Human.rig') verified in Phase 2.
 */
export const ATTACHMENT_ANCHORS: Record<GarmentSlot, AttachmentAnchor> = {
  top: {
    slot: 'top',
    primaryJoint: 'spine_02',
    secondaryJoints: ['spine_03', 'clavicle_l', 'clavicle_r'],
    description: 'Upper torso / chest anchor',
  },
  bottom: {
    slot: 'bottom',
    primaryJoint: 'pelvis',
    secondaryJoints: ['thigh_l', 'thigh_r'],
    description: 'Pelvis / hips anchor',
  },
  feet: {
    slot: 'feet',
    primaryJoint: 'foot_l',
    secondaryJoints: ['foot_r', 'ball_l', 'ball_r'],
    description: 'Feet / ankle anchor',
  },
  waist: {
    slot: 'waist',
    primaryJoint: 'spine_01',
    secondaryJoints: ['pelvis'],
    description: 'Waist / lower torso anchor',
  },
  hand: {
    slot: 'hand',
    primaryJoint: 'hand_r',
    secondaryJoints: ['hand_l'],
    description: 'Hand / wrist anchor',
  },
};

/**
 * Calculated final attachment transform resolved for runtime rendering.
 */
export interface ResolvedGarmentTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  anchorJoint: string;
}

/**
 * Single source of truth for resolving garment attachment transforms.
 * Combines avatar coordinate scale factors, skeletal anchor points, and garment registry metadata offsets.
 */
export function resolveGarmentTransform(
  garment: GarmentAssetConfig,
  avatarId: AvatarId = 'male'
): ResolvedGarmentTransform {
  const avatarConfig = AVATAR_REGISTRY[avatarId] || AVATAR_REGISTRY.male;
  const anchor = ATTACHMENT_ANCHORS[garment.slot] || ATTACHMENT_ANCHORS.top;

  // Resolve base avatar numeric scale factor
  const avatarNumericScale = Array.isArray(avatarConfig.scale)
    ? avatarConfig.scale[0]
    : avatarConfig.scale;

  // Scale resolution:
  // Garments with explicit config.scale use config.scale; otherwise fallback to avatarNumericScale.
  const targetScale = garment.scale ?? avatarNumericScale;

  // Position resolution: combine avatar position offset and explicit garment position offset
  const posOffset = garment.positionOffset || [0, 0, 0];
  const avatarPosOffset = avatarConfig.positionOffset || [0, 0, 0];
  const targetPosition: [number, number, number] = [
    avatarPosOffset[0] + posOffset[0],
    avatarPosOffset[1] + posOffset[1],
    avatarPosOffset[2] + posOffset[2],
  ];

  // Rotation resolution: combine avatar rotation offset and explicit garment rotation offset
  const rotOffset = garment.rotationOffset || [0, 0, 0];
  const avatarRotOffset = avatarConfig.rotationOffset || [0, 0, 0];
  const targetRotation: [number, number, number] = [
    avatarRotOffset[0] + rotOffset[0],
    avatarRotOffset[1] + rotOffset[1],
    avatarRotOffset[2] + rotOffset[2],
  ];

  return {
    position: targetPosition,
    rotation: targetRotation,
    scale: targetScale,
    anchorJoint: anchor.primaryJoint,
  };
}
