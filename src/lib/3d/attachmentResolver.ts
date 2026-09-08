import * as THREE from 'three';
import { GarmentSlot, GarmentAssetConfig } from '../../types/garment';
import { AvatarId } from '../../types/3d';

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
 * Defines explicit anchor-local transform offsets relative to the resolved attachment bone.
 */
export interface ResolvedGarmentTransform {
  localPosition: [number, number, number];
  localRotation: [number, number, number];
  garmentScale: number; // Authored local scale multiplier relative to bone anchor (default 1.0)
  anchorJoint: string;
}

/**
 * Traverses an avatar's loaded Three.js scene graph to locate a specific skeletal bone or joint object by name.
 */
export function findAvatarJoint(
  avatarScene: THREE.Object3D,
  jointName: string
): THREE.Object3D | null {
  if (!avatarScene) return null;

  let foundJoint: THREE.Object3D | null = null;
  avatarScene.traverse((child) => {
    if (!foundJoint && child.name === jointName) {
      foundJoint = child;
    }
  });

  return foundJoint;
}

/**
 * Resolves the actual runtime THREE.Bone / THREE.Object3D node from a loaded avatar scene for a given slot.
 * Enforces strict primary joint resolution. Does NOT silently fall back to secondary joints.
 * Throws a controlled Attachment Error if the required primary skeletal joint cannot be found.
 */
export function resolveAttachmentAnchor(
  avatarScene: THREE.Object3D,
  slot: GarmentSlot,
  avatarId: AvatarId = 'male'
): THREE.Object3D {
  if (!avatarScene) {
    throw new Error(
      `Attachment Error: Cannot resolve attachment anchor for slot "${slot}" on avatar "${avatarId}". Avatar scene is null or undefined.`
    );
  }

  const anchorDef = ATTACHMENT_ANCHORS[slot] || ATTACHMENT_ANCHORS.top;
  const primaryJointName = anchorDef.primaryJoint;

  const jointNode = findAvatarJoint(avatarScene, primaryJointName);

  if (!jointNode) {
    throw new Error(
      `Attachment Error: Required skeletal joint "${primaryJointName}" for slot "${slot}" on avatar "${avatarId}" was not found in avatar hierarchy.`
    );
  }

  return jointNode;
}

/**
 * Single source of truth for resolving garment attachment transform calculations.
 * Returns anchor-local transform offsets relative to the resolved primary attachment bone.
 */
export function resolveGarmentTransform(
  garment: GarmentAssetConfig
): ResolvedGarmentTransform {
  const anchor = ATTACHMENT_ANCHORS[garment.slot] || ATTACHMENT_ANCHORS.top;
  const garmentScale = garment.scale ?? 1.0;

  const localPosition: [number, number, number] = garment.positionOffset
    ? [...garment.positionOffset]
    : [0, 0, 0];

  const localRotation: [number, number, number] = garment.rotationOffset
    ? [...garment.rotationOffset]
    : [0, 0, 0];

  return {
    localPosition,
    localRotation,
    garmentScale,
    anchorJoint: anchor.primaryJoint,
  };
}

/**
 * Genuinely attaches a garment Object3D into the avatar's real skeletal bone hierarchy.
 * Reparents the garment into the target bone node (`anchorNode.add(garmentGroup)`) with local transform offsets relative to the bone.
 * Sets garment local position, rotation, and scale directly relative to the anchor node.
 * Inherits avatar normalization scale (e.g. 0.11 / 0.10) naturally through the parent bone hierarchy.
 */
export function attachGarmentToAnchor(
  garmentGroup: THREE.Object3D,
  anchorNode: THREE.Object3D,
  transform?: ResolvedGarmentTransform
): void {
  if (!garmentGroup || !anchorNode) return;

  // Detach from current parent if parented elsewhere
  if (garmentGroup.parent && garmentGroup.parent !== anchorNode) {
    garmentGroup.parent.remove(garmentGroup);
  }

  // Genuinely add into bone's Object3D hierarchy as a child
  if (garmentGroup.parent !== anchorNode) {
    anchorNode.add(garmentGroup);
  }

  // Apply anchor-local transforms directly on the garment group
  garmentGroup.matrixAutoUpdate = true;

  if (transform) {
    garmentGroup.position.set(...transform.localPosition);
    garmentGroup.rotation.set(...transform.localRotation);
    garmentGroup.scale.setScalar(transform.garmentScale);
  } else {
    garmentGroup.position.set(0, 0, 0);
    garmentGroup.rotation.set(0, 0, 0);
    garmentGroup.scale.setScalar(1.0);
  }

  garmentGroup.updateMatrix();
  anchorNode.updateMatrixWorld(true);
}

/**
 * Detaches a garment Object3D from its current avatar bone parent.
 */
export function detachGarmentFromAnchor(garmentGroup: THREE.Object3D): void {
  if (garmentGroup && garmentGroup.parent) {
    garmentGroup.parent.remove(garmentGroup);
  }
}
