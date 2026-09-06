/**
 * 3D Scene, Viewer, and Engine Asset Type Definitions
 * Phase 1 & Phase 2 Asset Foundation
 */

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
 * Interface boundary for future garment/clothing system.
 * Allows future garment layers to attach to avatar slots without refactoring the viewer.
 */
export interface GarmentSlot {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  modelUrl?: string;
  visible: boolean;
}

/**
 * Standard skeletal joint reference points available on the base avatar model.
 * Used for future attachment alignment without requiring hardcoded magic strings.
 */
export type AvatarJointName =
  | 'torso_joint_1'
  | 'torso_joint_2'
  | 'torso_joint_3'
  | 'neck_joint_1'
  | 'neck_joint_2'
  | 'arm_joint_L_1'
  | 'arm_joint_L_2'
  | 'arm_joint_L_3'
  | 'arm_joint_R_1'
  | 'arm_joint_R_2'
  | 'arm_joint_R_3'
  | 'leg_joint_L_1'
  | 'leg_joint_L_2'
  | 'leg_joint_L_3'
  | 'leg_joint_L_5'
  | 'leg_joint_R_1'
  | 'leg_joint_R_2'
  | 'leg_joint_R_3'
  | 'leg_joint_R_5';

/**
 * Props for the reusable Avatar component.
 */
export interface AvatarProps {
  modelUrl?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
  garmentSlots?: GarmentSlot[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  deepCloneMaterials?: boolean;
  onLoad?: () => void;
}

/**
 * Generic 3D Asset Definitions (Phase 1 & Phase 2 Engine Infrastructure)
 * Clean, generic model contracts decoupled from commerce/product logic.
 */
export type AssetType = 'avatar' | 'garment' | 'accessory' | 'prop' | 'environment';

export interface AssetMetadata {
  scale?: [number, number, number];
  positionOffset?: [number, number, number];
  rotationOffset?: [number, number, number];
  format?: 'glb' | 'gltf';
  fileSizeBytes?: number;
  [key: string]: unknown;
}

export interface AvatarMetadata extends AssetMetadata {
  heightMeters?: number;
  neutralPose?: string;
  skeletonType?: string;
  jointNames?: AvatarJointName[];
  attachmentPoints?: Record<string, [number, number, number]>;
}

export interface Asset3D {
  id: string;
  url: string;
  name: string;
  type: AssetType;
  metadata?: AssetMetadata;
}

export interface AvatarAsset extends Asset3D {
  type: 'avatar';
  metadata?: AvatarMetadata;
}

export type AssetLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AssetLoadState {
  status: AssetLoadStatus;
  progress: number; // 0 to 100
  error: Error | null;
}
