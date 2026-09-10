/**
 * 3D Scene, Viewer, and Engine Viewer Type Definitions
 * Phase 1, Phase 2, & Phase 5 Scene Infrastructure
 */

import { AssetType } from './asset';

export type { AssetType };

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  position: [number, number, number];
}

export interface CameraControlsRef {
  resetCamera: () => void;
}

export interface SceneConfig {
  backgroundColor: string;
  enableGrid?: boolean;
  enableShadows?: boolean;
}

/**
 * Supported avatar identifiers for Phase 2 multi-avatar support.
 * Designed to cleanly extend in future phases (e.g. 'boy', 'girl', body variants).
 */
export type AvatarId = 'male' | 'female';

/**
 * Avatar Registry Configuration Contract
 * Maps an avatar identifier to its runtime asset URL and normalized transforms.
 */
export interface AvatarConfig {
  id: AvatarId;
  name: string;
  modelUrl: string;
  scale: [number, number, number] | number;
  positionOffset: [number, number, number];
  rotationOffset: [number, number, number];
  gender: 'male' | 'female' | 'unisex';
}

/**
 * Interface boundary for garment attachment slots.
 */
export interface GarmentSlotConfig {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  modelUrl?: string;
  visible: boolean;
}

/**
 * Standard skeletal joint reference points available on MakeHuman / MPFB2 base avatars.
 * Directly corresponds to the 53-joint humanoid armature in the GLB runtime assets.
 */
export type AvatarJointName =
  | 'Root'
  | 'pelvis'
  | 'spine_01'
  | 'spine_02'
  | 'spine_03'
  | 'clavicle_l'
  | 'upperarm_l'
  | 'lowerarm_l'
  | 'hand_l'
  | 'index_01_l'
  | 'index_02_l'
  | 'index_03_l'
  | 'middle_01_l'
  | 'middle_02_l'
  | 'middle_03_l'
  | 'pinky_01_l'
  | 'pinky_02_l'
  | 'pinky_03_l'
  | 'ring_01_l'
  | 'ring_02_l'
  | 'ring_03_l'
  | 'thumb_01_l'
  | 'thumb_02_l'
  | 'thumb_03_l'
  | 'clavicle_r'
  | 'upperarm_r'
  | 'lowerarm_r'
  | 'hand_r'
  | 'index_01_r'
  | 'index_02_r'
  | 'index_03_r'
  | 'middle_01_r'
  | 'middle_02_r'
  | 'middle_03_r'
  | 'pinky_01_r'
  | 'pinky_02_r'
  | 'pinky_03_r'
  | 'ring_01_r'
  | 'ring_02_r'
  | 'ring_03_r'
  | 'thumb_01_r'
  | 'thumb_02_r'
  | 'thumb_03_r'
  | 'neck_01'
  | 'head'
  | 'thigh_l'
  | 'calf_l'
  | 'foot_l'
  | 'ball_l'
  | 'thigh_r'
  | 'calf_r'
  | 'foot_r'
  | 'ball_r';

/**
 * Props for the reusable Avatar component.
 */
export interface AvatarProps {
  avatarId?: AvatarId;
  modelUrl?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  garmentSlots?: GarmentSlotConfig[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  deepCloneMaterials?: boolean;
  onLoad?: () => void;
}

export type AssetLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AssetLoadState {
  status: AssetLoadStatus;
  progress: number; // 0 to 100
  error: Error | null;
}
