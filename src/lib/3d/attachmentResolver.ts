import * as THREE from 'three';
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
 * Throws a controlled error if the required skeletal joint cannot be found.
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

  let jointNode = findAvatarJoint(avatarScene, primaryJointName);

  if (!jointNode && anchorDef.secondaryJoints) {
    for (const secJointName of anchorDef.secondaryJoints) {
      jointNode = findAvatarJoint(avatarScene, secJointName);
      if (jointNode) break;
    }
  }

  if (!jointNode) {
    throw new Error(
      `Attachment Error: Required skeletal joint "${primaryJointName}" for slot "${slot}" on avatar "${avatarId}" was not found in avatar hierarchy.`
    );
  }

  return jointNode;
}

/**
 * Single source of truth for resolving garment attachment transform calculations.
 */
export function resolveGarmentTransform(
  garment: GarmentAssetConfig,
  avatarId: AvatarId = 'male'
): ResolvedGarmentTransform {
  const avatarConfig = AVATAR_REGISTRY[avatarId] || AVATAR_REGISTRY.male;
  const anchor = ATTACHMENT_ANCHORS[garment.slot] || ATTACHMENT_ANCHORS.top;

  const avatarNumericScale = Array.isArray(avatarConfig.scale)
    ? avatarConfig.scale[0]
    : avatarConfig.scale;

  const targetScale = garment.scale ?? avatarNumericScale;

  const posOffset = garment.positionOffset || [0, 0, 0];
  const avatarPosOffset = avatarConfig.positionOffset || [0, 0, 0];
  const targetPosition: [number, number, number] = [
    avatarPosOffset[0] + posOffset[0],
    avatarPosOffset[1] + posOffset[1],
    avatarPosOffset[2] + posOffset[2],
  ];

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

/**
 * Genuinely attaches a garment Object3D into the avatar's real skeletal bone hierarchy.
 * Reparents the garment into the target bone node (`anchorNode.add(garmentGroup)`) with local transform offsets relative to the bone.
 * Computes local space transformation from parent bone's world matrix to prevent double-scaling or bone-origin offsets.
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

  anchorNode.updateMatrixWorld(true);

  // Calculate target world matrix in avatar space
  const scaleVal = transform?.scale ?? 0.1;
  const posOffset = transform?.position ?? [0, 0, 0];
  const rotOffset = transform?.rotation ?? [0, 0, 0];

  const targetWorldMatrix = new THREE.Matrix4();
  const rotationEuler = new THREE.Euler(rotOffset[0], rotOffset[1], rotOffset[2]);
  const quaternion = new THREE.Quaternion().setFromEuler(rotationEuler);
  const positionVec = new THREE.Vector3(posOffset[0], posOffset[1], posOffset[2]);
  const scaleVec = new THREE.Vector3(scaleVal, scaleVal, scaleVal);

  targetWorldMatrix.compose(positionVec, quaternion, scaleVec);

  // Convert target world matrix into anchorNode local space
  const parentInverseWorld = anchorNode.matrixWorld.clone().invert();
  const localMatrix = parentInverseWorld.multiply(targetWorldMatrix);

  garmentGroup.matrixAutoUpdate = false;
  garmentGroup.matrix.copy(localMatrix);
  garmentGroup.matrixWorldNeedsUpdate = true;

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
