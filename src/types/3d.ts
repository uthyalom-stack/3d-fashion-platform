/**
 * 3D Scene, Viewer, and Engine Asset Type Definitions
 * Phase 1 Asset Foundation
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

export interface AvatarProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  garmentSlots?: GarmentSlot[];
}

/**
 * Generic 3D Asset Definitions (Phase 1 Engine Infrastructure)
 * Clean, generic model contract decoupled from commerce/product logic.
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

export interface Asset3D {
  id: string;
  url: string;
  name: string;
  type: AssetType;
  metadata?: AssetMetadata;
}

export type AssetLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface AssetLoadState {
  status: AssetLoadStatus;
  progress: number; // 0 to 100
  error: Error | null;
}
